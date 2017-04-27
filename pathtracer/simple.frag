#version 420

// required by GLSL spec Sect 4.5.3 (though nvidia does not, amd does)
precision highp float;
/*//////////////////////////////////////////////////////
/////Input from main
*///////////////////////////////////////////////////////
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
//Raymarcher parameters
uniform float ground_threshold;
uniform float max_steps;
uniform float count_check;
float step_size = 1.0f/max_steps;
float f = 1.67f; //focal length
float texture_ISO_threshold = 0.3f;
float alpha = 0.005;
//UV-coordinates
in vec2 fragCoord; // image plane (-1,1)
float intersectionMin = 0;
float intersectionMax = 0;
vec3 box_size = vec3(aabb_noise_max - aabb_noise_min);
layout (location = 0) out vec4 fragmentColor;


/*//////////////////////////////////////////////////////
///// Noise calculation
*///////////////////////////////////////////////////////

//Properties
const int octaves = 6;

//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
// Fragment shader code for testing purposes.
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
const int ITR = 100;
const float FAR = 5.0;
const float dt = FAR/float(ITR);
const mat3 m3  = mat3( 0.00,  0.80,  0.60,
                      -0.80,  0.36, -0.48,
                      -0.60, -0.48,  0.64 );

float hash1( float n ) {
    return fract( n * 17.0 * fract( n * 0.3183099 ) );
}

float noise( in vec3 x ) {
    vec3 p = floor(x);
    vec3 w = fract(x);
    
    //Fade function
    vec3 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
    
    float n = p.x + 317.0 * p.y + 157.0 * p.z;
    
    float a = hash1(n + 0.0);
    float b = hash1(n + 1.0);
    float c = hash1(n + 317.0);
    float d = hash1(n + 318.0);
    float e = hash1(n + 157.0);
	float f = hash1(n + 158.0);
    float g = hash1(n + 474.0);
    float h = hash1(n + 475.0);

    float k0 =   a;
    float k1 =   b - a;
    float k2 =   c - a;
    float k3 =   e - a;
    float k4 =   a - b - c + d;
    float k5 =   a - c - e + g;
    float k6 =   a - b - e + f;
    float k7 = - a + b + c - d + e - f - g + h;

    return -1.0 + 2.0 * (k0 + k1 * u.x + k2 * u.y + k3 * u.z + k4 * u.x * u.y + k5 * u.y * u.z + k6 * u.z * u.x + k7 * u.x * u.y * u.z);
}


float fbm_4( in vec3 x ) {

    float frequency = 2.0;
    float gain = 0.5;
    float amplitude = 0.5;
    float value = 0.0;
    
    for( int i=0; i < octaves; i++ ) {
        float noise = noise(x);
        value += amplitude * noise;
        amplitude *= gain;
        x = frequency * m3 * x;
    }

return value;
}


void main() {
    //Setup.
    vec2 iResolution = vec2(resolution_x, resolution_y);
    vec2 p = fragCoord / iResolution - 0.5;
	p.x *= iResolution.x / iResolution.y;
	vec2 um = iMouse / iResolution - 0.5;
	um.x *= iResolution.x / iResolution.y;

    // Camera.
	vec3 ro = eye;
	vec3 rd =normalize(forward * f + right*fragCoord.x *aspect_ratio + up*fragCoord.y);
    // ro.x += um.x;
    // ro.z += 10.0 * um.y;

	// March.
    float t = 0.0;
    float ctr = 0.0;
	for( int i = 0 ; i < ITR; i++ ) {
        // New position.
        vec3 pos = ro + t * rd;
        // Calculate sdf.
        
        float sdf_noise  = fbm_4(pos) * 0.5 + 0.5; // Four layers of noise.. mapped from (-1, 1) -> (0,1)
        float sdf_floor  = pos.y + 0.6;
        float sdf_val    = sdf_floor + sdf_noise;
        //float sdf_sphere = length(vec3(0.0) - pos); // Radius 1, center at (0,0,0)
        //float sdf_val    = sdf_sphere * sdf_noise;

        // My code
     //    if (count_check < ctr) {
     //     fragmentColor = vec4(sdf_noise,0,0,1); 
     //     break;
     // }

        // Iso-level check.d
		if ( sdf_val < 0.5 ) {
			// fragmentColor = vec4(sdf_val, 0, 0,1);
			break;
		};
       
        // Step forward and increment debug ctr.
        t   += dt;
        ctr += 1.0;
	}
	    
    // Shade.
	fragmentColor = vec4(vec3(ctr / float(ITR)),1.0);
	// fragmentColor = vec4(fbm_4(vec3(fragCoord.x, fragCoord.y, 0)), 0 ,0, 1);
}


