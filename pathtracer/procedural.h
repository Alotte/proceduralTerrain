#pragma once
#include <glm/glm.hpp>
#include <vector>
#include <Model.h>
#include <omp.h>

#ifdef M_PI
#undef M_PI
#endif
#define M_PI 3.14159265359f
#define EPSILON 0.0001f

using namespace glm;

namespace pathtracer
{
	extern struct AABB {
		vec3 min_corner;
		vec3 max_corner;
	} bounding_box_aa;

	extern struct NoiseTexture3D {

	int res_x, res_y, res_z;
	std::vector<glm::vec3> image; // TODO: 3D texture data verify 
	float * getPointer() { return & image[0].x; }
	} noise_texture_3D;
	
	///////////////////////////////////////////////////////////////////////////
	// On window resize, window size is passed in, actual size of pathtraced
	// image may be smaller (if we're subsampling for speed)
	///////////////////////////////////////////////////////////////////////////
	void resizeTexture(int w, int h, int d);

	void createNoiseIsoTexture();

	///////////////////////////////////////////////////////////////////////////
	// Trace one path per pixel
	///////////////////////////////////////////////////////////////////////////
};

