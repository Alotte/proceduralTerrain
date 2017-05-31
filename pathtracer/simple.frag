#version 420
// required by GLSL spec Sect 4.5.3 (though nvidia does not, amd does)
precision highp float;



//--------------------Final color-----------------------
layout (location = 0) out vec4 fragmentColor;

//////////////////////////////////////////////////////////
//// Camera
/////////////////////////////////////////////////////////
uniform vec3 eye; // Position
uniform vec3 right;
uniform vec3 up;
uniform vec3 forward;

//////////////////////////////////////////////////////////
////// Lighting
//////////////////////////////////////////////////////////
//---------Terrain Material-----------------------
uniform vec3 material_color;
uniform float material_reflectivity;
uniform float material_metalness;
uniform float material_fresnel;
uniform float material_shininess;
uniform float material_emission;
uniform float soft_shadow_multiplier;

//---------Constants-----------------------------
#define PI 3.14159265359
//---------First light---------------------------
//vec3 sun_dir = vec3(0,-1, 0.4);
vec3 sun_dir = vec3(0.624695,0.2,0.624695);
vec3 sun_color = vec3(1.0,0.89, 0.76);
float sun_intensity = 1.4;
//---------Second light---------------------------
vec3 sky_dir = vec3(0, 1, 0);
vec3 sky_color = vec3(0.4,0.66,1);
float sky_intensity = 0.4;
//---------Third light ("Ambient")----------------
vec3 indirect_dir = vec3(-0.624695, 0 ,-0.624695);
vec3 indirect_color = normalize(vec3(0.9,0.6,0.2)*material_color);//Sun*scene.
float indirect_intensity = 0.2;

/////////////////////////////////////////////////////////
/////Raymarcher parameters
/////////////////////////////////////////////////////////
const float ground_threshold = 0.5f;
uniform int max_steps;
uniform float count_check;
uniform float far_plane;
float f = 1.67f; //focal length

//////////////////////////////////////////////////////////
///// Screen
//////////////////////////////////////////////////////////
uniform float aspect_ratio;
uniform float resolution_x;
uniform float resolution_y;

//UV-coordinates-----------------------------
in vec2 fragCoord; // image plane (-1,1)
//-----------Noise Properties--------------
const int octaves = 6;
const int ITR = max_steps;
// const float FAR = 5.0;
// const float dt = FAR/float(ITR);
const mat3 m3  = mat3( 0.00,  0.80,  0.60,
                      -0.80,  0.36, -0.48,
                      -0.60, -0.48,  0.64 );
const mat3 m3i = mat3( 0.00, -0.80, -0.60,
                       0.80,  0.36, -0.48,
                       0.60, -0.48,  0.64 );

/*//////////////////////////////////////////////////////
///// Noise calculation
*///////////////////////////////////////////////////////

float hash1( float n ) {
    return fract( n * 17.0 * fract( n * 0.3183099 ) );
}

//Returns the 3D noise value and its three derivatives.
vec4 noise( in vec3 x ) {
    vec3 p = floor(x);
    vec3 w = fract(x);
    
    //Fade function to make transition between gradients smooth.
    vec3 u = w * w * w * (w * (w * 6.0 - 15.0) + 10.0);
    //Derivative of the fade function.
    vec3 du = 30.0 * w * w * (w * (w - 2.0) + 1.0);
 
    //Compute 1D value for the hash for each corner of the box.
    float n = p.x + 317.0 * p.y + 157.0 * p.z;
    
    // Hash offseted 'box' coordinates (0,1).
    float a = hash1(n + 0.0);
    float b = hash1(n + 1.0);
    float c = hash1(n + 317.0);
    float d = hash1(n + 318.0);
    float e = hash1(n + 157.0);
	float f = hash1(n + 158.0);
    float g = hash1(n + 474.0);
    float h = hash1(n + 475.0);

    //Gradients (-8,8) theoretical max min
    float k0 =   a;
    float k1 =   b - a;
    float k2 =   c - a;
    float k3 =   e - a;
    float k4 =   a - b - c + d;
    float k5 =   a - c - e + g;
    float k6 =   a - b - e + f;
    float k7 = - a + b + c - d + e - f - g + h;

   //Use gradients and fade function to create the noise value. (-1,1).
   //Not entirely sure of this black magic yet.

    return vec4( -1.0 + 2.0 *(k0 + 
    					k1 * u.x + 
    					k2 * u.y + 
    					k3 * u.z + 
    					k4 * u.x * u.y + 
    					k5 * u.y * u.z + 
    					k6 * u.z * u.x + 
    					k7 * u.x * u.y * u.z), 
   					// Analytical noise derivative at given point.
                      2.0 * du * vec3(k1 + k4 * u.y + k6 * u.z + k7 * u.y * u.z,
                                      k2 + k5 * u.z + k4 * u.x + k7 * u.z * u.x,
                                      k3 + k6 * u.x + k5 * u.y + k7 * u.x *u.y ) );
    // return -1.0 + 2.0 * (k0 + 
    // 					k1 * u.x + 
    // 					k2 * u.y + 
    // 					k3 * u.z + 
    // 					k4 * u.x * u.y + 
    // 					k5 * u.y * u.z + 
    // 					k6 * u.z * u.x + 
    // 					k7 * u.x * u.y * u.z);
}

// Returns the fractal brownian motion noise and its three derivatives.
vec4 fbm_4( in vec3 x ) {

    float frequency = 2.0f;
    float gain = 0.5f;
    float value = 0.0f;
    float amplitude = 0.9f;
    vec3 derivative = vec3(0.0);
    mat3  m = mat3(1.0,0.0,0.0,
                   0.0,1.0,0.0,
                   0.0,0.0,1.0);

    for( int i=0; i < octaves; i++ ) {
        vec4 noise = noise(x);
        value += amplitude * noise.x;
        derivative += amplitude * m * noise.yzw;
        amplitude *= gain;
        // To mitigate aliasing in noise use matrices.
        x = frequency * m3 * x;
        m = frequency * m3i * m; 
    }

return vec4(value,derivative);
}

// Coarser noise
vec4 fbm_4a( in vec3 x ) {

    float frequency = 4.0f;
    float gain = 0.5f*0.1;
    float value = 0.0f;
    float amplitude = 0.1f;
    vec3 derivative = vec3(0.0);
    mat3  m = mat3(1.0,0.0,0.0,
                   0.0,1.0,0.0,
                   0.0,0.0,1.0);

    for( int i=0; i < 3; i++ ) {
        vec4 noise = noise(x);
        value += amplitude * noise.x;
        derivative += amplitude * m * noise.yzw;
        amplitude *= gain;
        // To mitigate aliasing in noise use matrices.
        x = frequency * m3 * x;
        m = frequency * m3i * m; 
    }

return vec4(value,derivative);
}



float sdPlane( vec3 p, vec4 n ) {
  // n must be normalized
  return dot(p,n.xyz) + n.w;
}

// Calculate shortest distance, 
// Each input is the distance to a surface.
float minDist(float d1, float d2) {
	return (d1 < d2) ? d1 : d2;
}

float subtractSurface( float d1, float d2, out float chosenSurface) {
    float subtraction = max(d1 , d2);
    subtraction == d2 ? 2 : 1;
    return subtraction;
}



float sphere_sdf( vec3 p, float s ) {
  return length(p) - s;
}


float dist_all(vec3 pos) {
    vec4 fbm_noise = fbm_4(pos);
    float sdf_noise  = fbm_noise.x  *0.5 +0.5; // Four layers of noise.. mapped from (-1, 1) -> (0,1)
    float sdf_floor  = pos.y + 0.6;

    //DIST 1
    float dist_sphere = sphere_sdf(pos, 0.5f);
    
    //DIST 2
    float dist_noise = sdf_floor + sdf_noise ;


    return min(dist_noise,dist_sphere);
}
//Raymarches fractal brownian motion noise currently.
void raymarch(vec3 ro, vec3 rd, out float ctr,  out float t, out vec3 derivative) {
	
    float min_dist = 0;
    float step_size = 0;
	vec3 pos = vec3(0);
    //Uses this for interpolation
    float dist_noise = 0;
    float sdf_noise = 0;
    float sdf_floor = 0;

    //Ground
    float dist_ground = 0;
    vec4 underground_noise = vec4(0);

	// March.
	for( int i = 0 ; i < ITR; i++ ) {
        // New position.
        pos = ro + t * rd;

        //Stop if we reach the far-plane.
        if (length(t * rd) > far_plane) {
            break;
        }

        //-------------------------------------------------------------
        //---------Noise distance function-----------------------------
        //-------------------------------------------------------------

        // The distance to the noise.
        float mountain_noise_multiplier = 0.5;
        vec4 fbm_noise = fbm_4(pos) * mountain_noise_multiplier;

        sdf_noise  = fbm_noise.x + 0.5 ; // Four layers of noise.. mapped from (-1, 1) -> (0,1)
        // The floor distance function for noise 
        sdf_floor  = pos.y + 0.6;
        // Add the noise and floor for surface.
        dist_noise    = sdf_floor + sdf_noise;

        //Noise surface was found
		if ( dist_noise <= ground_threshold ) {
           
            //Derivative for the ground.
            vec3 derivative_floor = vec3(0,1,0);
            //Derivative of the noise.
            vec3 derivative_noise = fbm_noise.yzw;
			derivative = normalize( derivative_floor + derivative_noise);
			break;
		};

        //--------------------------------------------------------------
        //---------Ground distance function-----------------------------
        //--------------------------------------------------------------

        underground_noise = fbm_4(pos) * mountain_noise_multiplier;
        float dist_underground = underground_noise.x - 0.5; //Map [0,1]

        //Distance function of the ground
        dist_ground = pos.y + 1.1;
        float ground_multiplier = 0.1;
        float dist =  dist_ground + ground_multiplier* dist_underground;
        //Ground surface was found.
        if (dist_ground <= ground_threshold) {
            derivative = normalize(vec3(0,1,0) + ground_multiplier * underground_noise.yzw) ;
            break;
        }

        //--------------------------------------------------------------
        //---------Underground noise function-----------------------------
        //--------------------------------------------------------------
        //SPHERE
        float dist_sphere = sphere_sdf(pos, 0.5f);
        if (dist_sphere <= ground_threshold) {
            vec3 der_sphere = vec3(4*PI*0.5*0.5);
            derivative = normalize(der_sphere);
            break;
        }

        //--------------------------------------------------------------
        //---------Calculate the closest structure's distance-----------
        //--------------------------------------------------------------
        min_dist = min(dist_ground, min(dist_noise,dist_sphere));
       	
        // Step forward the shortest distance seen.
        step_size = (min_dist - 0.999 * ground_threshold) * 0.6 ;
        t   += step_size;
        ctr += 1.0;
	}
}


//Old function for an approximate normal.
vec3 terrainNormal(vec3 v1) {
	vec3 v2 = { 0,0,0 };
	v2.x = v1.x;
	v2.y = v1.y;
	v2.z = 1;
	return normalize(v2);
}

vec3 calculateDirectIllumiunation(vec3 wo, vec3 n, vec3 light_dir, vec3 light_color, float light_intensity) {
    vec3 wi = normalize(light_dir); //Direction Toward light source.
    float liCond = dot(wi, n);
    if (liCond <= 0)    return vec3(0);
    // Disregard distance to directional light!
    vec3 Li = light_intensity * light_color;
    // Diffuse term  does not need BRDF since we do gamma correction.
    vec3 diffuse_term = clamp(material_color *  abs(liCond) * Li, 0.0, 1.0);
    return diffuse_term;
    //We don't care about the BRDF because it gives practically the same light, we use gamma correction.
}

vec3 fog(in vec3 landscape_color, in float distance, in vec3 rayDir, in vec3 sunDir) {
    float fog_intensity = 0.03;
    float fogAmount = 1.0 - exp(-distance * fog_intensity);
    //Is there sun or is it in shadow
    float sunAmount = max( dot(rayDir, sunDir), 0.0);
    //We want the fog to be affected by the intensity of the sunlight.
    float sun_bleed = pow(sunAmount, 8.0);
    vec3 fogColor = mix(sky_color, sun_color, sun_bleed);
    return mix(landscape_color, fogColor, fogAmount);
} 


float shadow( in vec3 ro, in vec3 directional_light, float maxt ) {
    float res = 1.0f;
    float sun_distance = 50;
    vec3 sun_position = directional_light * sun_distance;
    vec3 rd = normalize(sun_position - ro);
    vec3 pos = vec3(0);
    int b = 0;
    for( float t = 0.1f; t < maxt; ) {
        pos = ro + rd * t;

        float dist_noise = dist_all(pos);


        if( dist_noise < 0.99*ground_threshold) {
            return 0;
        }

        res = min (res, soft_shadow_multiplier * (dist_noise-0.99*ground_threshold) / t);
        t += dist_noise;
        b++;
        if (b > 1000) break;
    }
    return res;
}

void shade (vec3 ro, vec3 rd) {
	//Perform raymarching
  	float ctr = 0.0;
  	vec3 derivative = vec3(0.0);
  	float t = 0;
    raymarch(ro, rd, ctr, t, derivative);

    float shadow_val = shadow(ro + rd * t, sun_dir, max_steps);
    // shadow_val *= 0.8*exp(2);
    // The normal will be the max slope since we're using distance fields.
    vec3 normal = derivative.xyz; //terrainNormal(derivative);
    // Shade.
	
    //Degug lighing / Ambient occlusion?
	// fragmentColor = vec4(1 - vec3(ctr / float(ITR)), 1.0)
    vec3 occlusion =  1 - vec3(ctr / float(ITR));
    vec3 ambient_occl_deluxe = vec3(occlusion.x);

    vec3 wo =  -normalize(ro + rd * t);
    //Regular lighting
    vec3 colorSun = calculateDirectIllumiunation( wo, normal, sun_dir, sun_color, sun_intensity);
    vec3 colorInd = calculateDirectIllumiunation( wo, normal, indirect_dir, indirect_color, indirect_intensity);
    vec3 color = colorSun;
    color *= shadow_val;
    color += colorInd;
    //Add the Sky.
    float sky = clamp(0.5 + 0.5 * normal.y, 0.0, 1.0);
    vec3 lin = sky * sky_color * sky_intensity;

    color += lin * material_color; //+ 0.4*vec3((ctr / float(ITR))*0.8, (ctr / float(ITR)),(ctr / float(ITR)));;
    //Add fog
    color *=  ambient_occl_deluxe;
    // color += 0.1*occlusion;
    color = fog(color, length(rd * t), rd, sun_dir);
    // + 0.6*vec3((ctr / float(ITR))*0.8, (ctr / float(ITR)),(ctr / float(ITR)));
    // gamma correction
    color = pow( color, vec3(1.0/2.2) );

    // final step, display (and perhaps color grade)
    fragmentColor = vec4(color.xyz, 1);
}

void main() {
     // Camera.
	vec3 ro = eye;
	vec3 rd = normalize(forward * f + right*fragCoord.x *aspect_ratio + up*fragCoord.y);
    shade(ro,rd);
}
	


