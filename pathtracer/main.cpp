
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
#include "material.cpp"

using namespace glm;

SDL_Window* g_window = nullptr;
int windowWidth = 0, windowHeight = 0;
///////////////////////////////////////////////////////////////////////////////
// Shader programs
///////////////////////////////////////////////////////////////////////////////
GLuint shaderProgram;

///////////////////////////////////////////////////////////////////////////////
// Shader parameters
///////////////////////////////////////////////////////////////////////////////
vec3 worldUp = vec3(0, 1, 0);
const float speed = 0.1f;
vec3 eye = vec3(0, 0, -2);
vec3 right		= vec3(1, 0, 0);
vec3 forward	= vec3(0, 0, 1);
///////////////////////////////////////////////////////////////////////////////
// Parameters for the raymarcher
///////////////////////////////////////////////////////////////////////////////
float ground_threshold = 0.5f;
float count_check = 0.0f;
int max_steps = 120;
float far_plane = 100.0f;
Material terrain_mat;

///////////////////////////////////////////////////////////////////////////////
// Lighting
///////////////////////////////////////////////////////////////////////////////
//First light
vec3 sun_dir = vec3(0,-1, 0.4);
vec3 sun_color = vec3(0.9,0.6,0.2);
float sun_intensity = 1.5;
//Second light
vec3 sky_dir = vec3(0,-1,0);
vec3 sky_color = vec3(0,0.8,0.2);
float sky_intensity = 0.2;
float soft_shadow_multiplier = 32.0f;

///////////////////////////////////////////////////////////////////////////////
// Load shaders, environment maps, models and so on
///////////////////////////////////////////////////////////////////////////////
void initialize() {
	///////////////////////////////////////////////////////////////////////////
	// Load shader program
	///////////////////////////////////////////////////////////////////////////
	shaderProgram = labhelper::loadShaderProgram("simple.vert", "simple.frag");

	//Add a sweet sweet bounding box for the noise.
	glUseProgram(shaderProgram);
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
	labhelper::setUniformSlow(shaderProgram, "sun_dir", sun_dir);	
	//Uniforms for terrain material (lighting)
	labhelper::setUniformSlow(shaderProgram, "material_fresnel", terrain_mat.material_fresnel);
	labhelper::setUniformSlow(shaderProgram, "material_color", terrain_mat.material_color);
	labhelper::setUniformSlow(shaderProgram, "material_emission", terrain_mat.material_emission);
	labhelper::setUniformSlow(shaderProgram, "material_shininess", terrain_mat.material_shininess);
	labhelper::setUniformSlow(shaderProgram, "material_reflectivity", terrain_mat.material_reflectivity);
	labhelper::setUniformSlow(shaderProgram, "material_metalness", terrain_mat.material_metalness);
	labhelper::setUniformSlow(shaderProgram, "material_color", terrain_mat.material_color);
	labhelper::setUniformSlow(shaderProgram, "far_plane", far_plane);
	labhelper::setUniformSlow(shaderProgram, "soft_shadow_multiplier", soft_shadow_multiplier);
	// labhelper::setUniformSlow(shaderProgram, "amplitude", noise_amplitude);

	labhelper::drawFullScreenQuad();

}


bool handleEvents(void) {
	// check events (keyboard among other)
	SDL_Event event;
	bool quitEvent = false;
	while (SDL_PollEvent(&event)) {
		if (event.type == SDL_QUIT || (event.type == SDL_KEYUP && event.key.keysym.sym == SDLK_ESCAPE)) {
			quitEvent = true;
		}
		/*if (event.type == SDL_KEYUP && event.key.keysym.sym == SDLK_g) {
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


void gui() {
	// Inform imgui of new frame
	ImGui_ImplSdlGL3_NewFrame(g_window);
	/////////////////////////////////////////////////////////////////////////////
	//// Raymarcher settings
	/////////////////////////////////////////////////////////////////////////////
	if (ImGui::CollapsingHeader("Raymarching", "pathtracer_ch", true, true))
	{
		ImGui::SliderFloat("Ground Threshold", &ground_threshold, 0.01f, 1.0f);
		ImGui::SliderFloat("Far Plane", &far_plane, 10.0f, 500.0f);
		ImGui::SliderInt("Max Raymarcher Steps", &max_steps, 10, 1000);
		ImGui::SliderFloat("Shadow softness", &soft_shadow_multiplier, 1, 128);
	}

	// Render the GUI.
	ImGui::Render();
}

int main(int argc, char *argv[]) {
	
	g_window = labhelper::init_window_SDL("Raymarching", 1280, 720);
	initialize();

	bool stopRendering = false;
	auto startTime = std::chrono::system_clock::now();

	while (!stopRendering) {
		// render to window
		display();

		// Then render overlay GUI.
		gui();

		// Swap front and back buffer. This frame will now be displayed.
		SDL_GL_SwapWindow(g_window);  

		// check events (keyboard among other)
		stopRendering = handleEvents();
	}

	// Shut down everything. This includes the window and all other subsystems.
	labhelper::shutDown(g_window);
	return 0;          
}
