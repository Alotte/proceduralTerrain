#include "procedural.h"
#include <memory>
#include <iostream>
#include <map>
#include <algorithm>
#include "noise.cpp"

using namespace std;
using namespace glm;

namespace pathtracer
{
	///////////////////////////////////////////////////////////////////////////
	// The rendered image
	///////////////////////////////////////////////////////////////////////////

	///////////////////////////////////////////////////////////////////////////////
	// Global variables
	///////////////////////////////////////////////////////////////////////////////
	NoiseTexture3D noise_texture_3D;
	AABB bounding_box_aa;
	Noise noise = Noise();

	float onSphere(vec3 p) {
		float radius = 0.3;
		float alpha = 0.05;
		float val = abs((length(p) - radius)) <= alpha ? 1 : 0;
		return val;
	}
	///////////////////////////////////////////////////////////////////////////
	// Procedural texture generation
	///////////////////////////////////////////////////////////////////////////

	void createNoiseIsoTexture() {
		//define bounding box.
		bounding_box_aa.max_corner = vec3(0.5, 0.5, 0.5); 
		bounding_box_aa.min_corner = vec3(-0.5, -0.5, -0.5);
		float err = 0.001f;
		//sampling sizes in u-v-w.
		int res_x	= noise_texture_3D.res_x;
		int res_y	= noise_texture_3D.res_y;
		int res_z	 = noise_texture_3D.res_z;
	
		// Add u-v-w position values to texture.
		for (int w = 0; w < res_z; w++) {
			for (int v = 0; v < res_y; v++) {
				for (int u = 0; u < res_x; u++) {
					//Find coordinates in [0,1] span for noise sampling.
					double x_f = u / (double)res_x;
					double y_f = v / (double)res_y;
					double z_f = w / (double)res_z;
					//printf("x: %g, y: %g, z: %g", x, y, z);
					double noiseDensity = noise.perlin(x_f, y_f, z_f);
					//printf("\n Noise density at Depth: %d Height %d Width %d s  %F \n", r, t, s, noiseDensity);
					noise_texture_3D.image[w*res_x*res_y+ v*res_x + u] = vec3(noiseDensity);
				}
			}
		}
	}

	void resizeTexture(int x, int y, int z) {
		noise_texture_3D.res_x = x;
		noise_texture_3D.res_y = y;
		noise_texture_3D.res_z = z; 
		int DIM1 = x;
		int DIM2 = y;
		int DIM3 = z;
		noise_texture_3D.image.resize(DIM1*DIM2*DIM3);
	}

};
