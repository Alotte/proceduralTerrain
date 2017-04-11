#version 420

// required by GLSL spec Sect 4.5.3 (though nvidia does not, amd does)
precision highp float;
/*//////////////////////////////////////////////////////
/////Input from main
*///////////////////////////////////////////////////////
//Our delicious uniforms that enable taking over the world.
uniform vec3 aabb_noise_max;
uniform vec3 aabb_noise_min;
// Camera Position
uniform vec3 eye;
// Camera
uniform vec3 right;
uniform vec3 up;
uniform vec3 forward;
//Screen
uniform float aspect_ratio;
uniform float resolution_x;
uniform float resolution_y;
//UV-coordinates
smooth in vec2 uv; // image plane (-1,1)
float intersectionMin = -1;
float intersectionMax = -1;

float max_steps = 30.0f;
float step_size = 0.01f;
float f = 1.67f; //focal length
float texture_ISO_threshold = 0.1f;
float alpha = 0.005;
vec3 box_size = vec3(aabb_noise_max - aabb_noise_min);
layout (location = 0) out vec4 fragmentColor;

/*//////////////////////////////////////////////////////
///// Noise calculation
*///////////////////////////////////////////////////////

//Properties
const int octaves = 6;
float lacunarity = 2.0f;
float gain = 0.5f;

// Initial values
float amplitude = 0.5f;
float frequency = 1.0f;

float hash (in vec3 p) { 
    return fract(sin(dot(p, vec3(12.9898,78.233, 63.304))) * 43758.5453123);
}

//Noise
float noise(in vec3 p) {
	vec3 i = floor(p); // floored.
	vec3 f = fract(p); //fractional part of argument.

	//Hash corners of a 3D tile
	float aaa, aba, aab, abb, baa, bba, bab, bbb;
	aaa = hash(i);
	aab = hash(i + vec3(1.0f, 0.0f, 0.0f));
	aba = hash(i + vec3(0.0f, 1.0f, 0.0f));
	abb = hash(i + vec3(1.0f, 1.0f, 0.0f));
	baa = hash(i + vec3(0.0f, 0.0f, 1.0f));
	bab = hash(i + vec3(1.0f, 0.0f, 1.0f));
	bba = hash(i + vec3(0.0f, 1.0f, 1.0f));
	bbb = hash(i + vec3(1.0f, 1.0f, 1.0f));

	// Fade function 
	vec3 u = f * f * f *( f * (f * 6 - 15) + 10); 

	float x1, x2, y1, y2;
    // based on https://www.shadertoy.com/view/4dS3Wd
    // Interpolate hashes and fade to get a noise value.
    // Unsure whether this will yield values between 0-1.
    return mix(mix(mix( aaa, aab, u.x),
                   mix( aba, abb, u.x), u.y),
               mix(mix( baa, bab, u.x),
                   mix( bba, bbb, u.x), u.y), u.z);	
}

//Loop of octaves
float fbm(vec3 p) {
	float value = 0.0f;
	for (int i = 0; i < octaves; i++) {
		value += amplitude * noise(frequency*p);
		frequency *= lacunarity;
		amplitude *= gain;
	}
	return value;
}

/*//////////////////////////////////////////////////////
///// Raymarching
*///////////////////////////////////////////////////////


float signedDistanceBox(vec3 p, vec3 b) {
	vec3 d = abs(p) - b;
	return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

bool noiseHit(vec3 p) {
	//vec3 p_tex = p + vec3(0.5);
	return fbm(p) > 0.22; // texture_ISO_threshold;
}

//Checks whether our ray intersects the provided AABB
bool intersection(vec3 origin, vec3 direction) {
	//find x-plane intersect
	float tmin, tmax, tymin, tymax, tzmin, tzmax;

	if (direction.x >= 0) {
		tmin = (aabb_noise_min.x - origin.x) / direction.x;
		tmax = (aabb_noise_max.x - origin.x) / direction.x;
	}
	else {
		tmax = (aabb_noise_min.x - origin.x) / direction.x;
		tmin = (aabb_noise_max.x - origin.x) / direction.x;
	}

	if (direction.y >= 0) {
		tymin = (aabb_noise_min.y - origin.y) / direction.y;
		tymax = (aabb_noise_max.y - origin.y) / direction.y;
	}
	else {
		tymax = (aabb_noise_min.y - origin.y) / direction.y;
		tymin = (aabb_noise_max.y - origin.y) / direction.y;
	}
	
	// no intersection
	if ((tmin > tymax) || (tymin > tmax)) return false; 

	if (tymin > tmin) tmin = tymin;
	if (tymax < tmax) tmax = tymax;

	if (direction.z >= 0) {
		tzmin = (aabb_noise_min.z - origin.z) / direction.z;
		tzmax = (aabb_noise_max.z - origin.z) / direction.z;
	}
	else {
		tzmax = (aabb_noise_min.z - origin.z) / direction.z;
		tzmin = (aabb_noise_max.z - origin.z) / direction.z;
	}
	
	if ((tmin > tzmax) || (tzmin > tmax)) return false;

	if (tzmin > tmin)	tmin = tzmin;
	if (tzmax < tmax) 	tmax = tzmax;
	
	intersectionMin = tmin;
	intersectionMax = tmax;

	return true ;//((tmin < 1000) && (tmax > 0));
}

vec4 raymarchNoise(vec3 ro, vec3 rd) {
	vec4 color = vec4(0.0);
	float t = 0;
	float count = 0;
	if (intersection(ro, rd)) {
		//we use intersectionMin and Max.
		
		// Camera inside object
		if ((intersectionMin < 0 && intersectionMax > 0)) {	
			vec3 p = ro + rd;
			while (count <= max_steps) {
				p += rd * t;
				// Found noise
				if (noiseHit(p)) {
					return vec4(
						1 - count / max_steps,
						1 - count / max_steps,
						1 - count / max_steps,
						1.0f); }
				t += step_size;
				count++; 
			}
		}

		// Camera not inside the object
		else {				
			vec3 p = ro + rd * intersectionMin;
			while (count <= max_steps) {
				p += rd * t;
				if (noiseHit(p)) {
					return vec4( 
					1 - count / max_steps,
					1 - count / max_steps,
					1 - count / max_steps,
					1.0f); }
				t += step_size;
				count++;
			}
		}
	
	}
	
	return color;
}

vec4 raymarchSphere(vec3 ro, vec3 rd) {
	vec4 color = vec4(0.0);
	float t = 0;
	float count = 0;
	
	if (intersection(ro,rd)) {
		vec3 end = ro + rd * intersectionMax; 
		
		// Camera inside object
		if (intersectionMin < 0 && intersectionMax > 0) {		
			vec3 p = ro;
			
			while(count <= max_steps) {
				p += rd * t;
				float s_dist = length(p) - 0.5f;
				// Found sphere
				if (s_dist < alpha) {
					return vec4(
						1 - count / max_steps,
						1 - count / max_steps,
						1 - count / max_steps,
						1.0f); }
				t += step_size;
				count++; 
			}
			return color;
		}

		// Camera not inside the object
		else {				
			vec3 p = ro + rd * intersectionMin;
			while (count <= max_steps) {
				p += rd * t;
				float s_dist = length(p) - 0.5f;
				if (s_dist < alpha) { 
					return vec4( 
					1 - count / max_steps,
					1 - count / max_steps,
					1 - count / max_steps,
					1.0f); }
				t += step_size;
				count++;
			}
		}
	
	}
		return color;
}

vec4 computeColor(vec3 ro, vec3 rd) {
	return vec4(0);

}


void main() 
{
	// image plane position (ray origin) eye is position of eye. Not direction!
	vec3 ro = eye;
	vec3 rd = normalize(forward * f + right*uv.x *aspect_ratio + up*uv.y);
	vec4 color = vec4(0.f, 0.5f, 1.0f, 0.0f); // Sky color
	
	fragmentColor= raymarchNoise(ro, rd);
}


