
#include <GL/glew.h>
#include <stb_image.h>
#include <chrono>
#include <iostream>
#include <labhelper.h>
#include <imgui.h>
#include <imgui_impl_sdl_gl3.h>
#include <glm/glm.hpp>
#include <glm/gtx/transform.hpp>
#include <Model.h>
#include <string>
#include "procedural.h"

using namespace glm;

///////////////////////////////////////////////////////////////////////////////
// Various globals
///////////////////////////////////////////////////////////////////////////////
SDL_Window* g_window = nullptr;
int windowWidth = 0, windowHeight = 0;
///////////////////////////////////////////////////////////////////////////////
// Shader programs
///////////////////////////////////////////////////////////////////////////////
GLuint shaderProgram;
///////////////////////////////////////////////////////////////////////////////
// GL texture to put pathtracing result into
///////////////////////////////////////////////////////////////////////////////
uint32_t noise_texture_3D_id;
///////////////////////////////////////////////////////////////////////////////
// Camera parameters.
vec3 worldUp = vec3(0, 1, 0);
const float speed = 0.1f;
vec3 eye = vec3(0, 0, -2);
vec3 right		= vec3(1, 0, 0);
vec3 forward	= vec3(0, 0, 1);

// Parameters for the raymarcher
float ground_threshold = 0.5f;
float count_check = 0.0f;
float max_steps = 1000.0f;

///////////////////////////////////////////////////////////////////////////////
// Load shaders, environment maps, models and so on
///////////////////////////////////////////////////////////////////////////////
void initialize()
{
	///////////////////////////////////////////////////////////////////////////
	// Load shader program
	///////////////////////////////////////////////////////////////////////////
	shaderProgram = labhelper::loadShaderProgram("simple.vert", "simple.frag");

	//Add a sweet sweet bounding box for the noise.
	glUseProgram(shaderProgram);
	labhelper::setUniformSlow(shaderProgram, "aabb_noise_min", pathtracer::bounding_box_aa.min_corner);//vec3
	labhelper::setUniformSlow(shaderProgram, "aabb_noise_max", pathtracer::bounding_box_aa.max_corner);
}

void display(void) {
	
	{	
		///////////////////////////////////////////////////////////////////////
		// If first frame, or window resized, or subsampling changes, 
		// inform the pathtracer
		///////////////////////////////////////////////////////////////////////
		int w, h; 
		SDL_GetWindowSize(g_window, &w, &h);
		if (windowWidth != w || windowHeight != h ) {
			windowWidth = w; 
			windowWidth = h;
		}
	}
	///////////////////////////////////////////////////////////////////////////
	// Render a fullscreen quad, and send the image plane and eye data to the shaders.
	///////////////////////////////////////////////////////////////////////////
	glViewport(0, 0, windowWidth, windowHeight);
	glClearColor(0.1, 0.1, 0.6, 1.0);
	glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
	glEnable(GL_DEPTH_TEST);
	glEnable(GL_CULL_FACE);
	SDL_GetWindowSize(g_window, &windowWidth, &windowHeight);

	//glUseProgram(shaderProgram);
	labhelper::setUniformSlow(shaderProgram, "eye", eye);
	labhelper::setUniformSlow(shaderProgram, "right", right);
	labhelper::setUniformSlow(shaderProgram, "forward", forward);
	vec3 up = normalize(cross(right, forward));
	labhelper::setUniformSlow(shaderProgram, "up", up);
	labhelper::setUniformSlow(shaderProgram, "resolution_x", (float)windowWidth);
	labhelper::setUniformSlow(shaderProgram, "resolution_y", (float)windowHeight);
	labhelper::setUniformSlow(shaderProgram, "aspect_ratio", (float)windowWidth / windowHeight);
	labhelper::setUniformSlow(shaderProgram, "ground_threshold", ground_threshold);
	labhelper::setUniformSlow(shaderProgram, "max_steps", max_steps);
	labhelper::setUniformSlow(shaderProgram, "count_check", count_check);	
	labhelper::drawFullScreenQuad();
}


bool handleEvents(void)
{
	// check events (keyboard among other)
	SDL_Event event;
	bool quitEvent = false;
	while (SDL_PollEvent(&event)) {
		if (event.type == SDL_QUIT || (event.type == SDL_KEYUP && event.key.keysym.sym == SDLK_ESCAPE)) {
			quitEvent = true;
		}
	/*	if (event.type == SDL_KEYUP && event.key.keysym.sym == SDLK_g) {
			showUI = !showUI;
		}*/
		/*if (event.type == SDL_KEYUP && event.key.keysym.sym == SDLK_r) {
			loadShaders(true);
		}*/
		if (event.type == SDL_MOUSEMOTION && !ImGui::IsMouseHoveringAnyWindow()) {
			static int prev_xcoord = event.motion.x;
			static int prev_ycoord = event.motion.y;
			int delta_x = event.motion.x - prev_xcoord;
			int delta_y = event.motion.y - prev_ycoord;

			if (event.button.button & SDL_BUTTON(SDL_BUTTON_LEFT)) {
				float rotationSpeed = 0.005f;
				mat4 yaw = rotate(rotationSpeed * -delta_x, worldUp);
				mat4 pitch = rotate(rotationSpeed * -delta_y, normalize(cross(forward, worldUp)));
				forward = vec3(pitch * yaw * vec4(forward, 0.0f));
			}
			prev_xcoord = event.motion.x;
			prev_ycoord = event.motion.y;
		}
	}

	// check keyboard state (which keys are still pressed)
	const uint8_t *state = SDL_GetKeyboardState(nullptr);
	right = cross(forward, worldUp);

	if (state[SDL_SCANCODE_W]) {
		eye += speed* forward;
	}
	if (state[SDL_SCANCODE_S]) {
		eye -= speed * forward;
	}
	if (state[SDL_SCANCODE_A]) {
		eye -= speed * right;
	}
	if (state[SDL_SCANCODE_D]) {
		eye += speed * right;
	}
	if (state[SDL_SCANCODE_Q]) {
		eye -= speed * worldUp;
	}
	if (state[SDL_SCANCODE_E]) {
		eye += speed * worldUp;
	}
	return quitEvent;
}

/*
bool handleEvents(void) {
	// check events (keyboard among other)
	SDL_Event event;
	bool quitEvent = false;

	// Allow ImGui to capture events.
	ImGuiIO& io = ImGui::GetIO();

	while (SDL_PollEvent(&event)) {
		ImGui_ImplSdlGL3_ProcessEvent(&event);

		if (event.type == SDL_QUIT || (event.type == SDL_KEYUP && event.key.keysym.sym == SDLK_ESCAPE)) {
			quitEvent = true;
		}
		
		if (!io.WantCaptureMouse) {
			if (event.type == SDL_MOUSEMOTION) {
				static int prev_xcoord = event.motion.x;
				static int prev_ycoord = event.motion.y;
				int delta_x = event.motion.x - prev_xcoord;
				int delta_y = event.motion.y - prev_ycoord;
				if (event.button.button & SDL_BUTTON(SDL_BUTTON_LEFT)) {
					float rotationSpeed = 0.005f;
					mat4 yaw = rotate(rotationSpeed * -delta_x, up);
					//mat4 pitch = rotate(rotationSpeed * -delta_y, normalize(cross(forward, up)));
					forward = vec3(yaw * vec4(forward, 0.0f));

					//vec4 newUp = pitch * vec4(up.x, up.y, up.z, 0);
					//up = vec3(newUp.x, newUp.y, newUp.z);
					right = normalize(cross(forward, up));
				}
				prev_xcoord = event.motion.x;
				prev_ycoord = event.motion.y;
			}
		}
	}

	if (!io.WantCaptureKeyboard)
	{
		// check keyboard state (which keys are still pressed)
		const uint8_t *state = SDL_GetKeyboardState(nullptr);
		right = cross(eye, up);
		const float speed = 0.1f; 
		if (state[SDL_SCANCODE_W]) {
			eye += eye*speed;
		}
		if (state[SDL_SCANCODE_S]) {
			eye -= speed * eye;
		}
		if (state[SDL_SCANCODE_A]) {
			eye -= speed * right;
		}
		if (state[SDL_SCANCODE_D]) {
			eye += speed * right;
		}
		if (state[SDL_SCANCODE_Q]) {
			eye -= speed * up;
		}
		if (state[SDL_SCANCODE_E]) {
			eye += speed * up;
		}
	}

	return quitEvent;
}
*/
void gui() {
	// Inform imgui of new frame
	ImGui_ImplSdlGL3_NewFrame(g_window);
	/////////////////////////////////////////////////////////////////////////////
	//// Raymarcher settings
	/////////////////////////////////////////////////////////////////////////////
	if (ImGui::CollapsingHeader("Pathtracer", "pathtracer_ch", true, true))
	{
		ImGui::SliderFloat("Ground Threshold", &ground_threshold, 0.01f, 1.0f);
		ImGui::SliderFloat("Noise Val at Count#", &count_check, 0.0f, 100);
	}
	// Render the GUI.
	ImGui::Render();
}

int main(int argc, char *argv[])
{
	g_window = labhelper::init_window_SDL("Raymarching", 1280, 720);

	initialize();

	bool stopRendering = false;
	auto startTime = std::chrono::system_clock::now();

	while (!stopRendering) {
		// render to window
		display();

		// Then render overlay GUI.
		// gui();

		// Swap front and back buffer. This frame will now be displayed.
		SDL_GL_SwapWindow(g_window);  

		// check events (keyboard among other)
		stopRendering = handleEvents();
	}
	// Shut down everything. This includes the window and all other subsystems.
	labhelper::shutDown(g_window);
	return 0;          
}
