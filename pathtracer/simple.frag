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
//---------Constants-----------------------------
#define PI 3.14159265359
//---------First light---------------------------
//vec3 sun_dir = vec3(0,-1, 0.4);
vec3  sun_dir = vec3(-0.624695,0.468521,-0.624695);
vec3 sun_color = vec3(0.9,0.6,0.2);
float sun_intensity = 1.5;
//---------Second light---------------------------
vec3 sky_dir = vec3(0, 1, 0.2);
vec3 sky_color = vec3(1, 1, 1);
float sky_intensity = 0.2;
//---------Terrain Material-----------------------
uniform vec3 material_color;
uniform float material_reflectivity;
uniform float material_metalness;
uniform float material_fresnel;
uniform float material_shininess;
uniform float material_emission;

/////////////////////////////////////////////////////////
/////Raymarcher parameters
/////////////////////////////////////////////////////////
uniform float ground_threshold;
uniform float max_steps;
uniform float count_check;
float step_size = 1.0f/max_steps;
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
const int octaves = 10;
const int ITR = 150;
const float FAR = 5.0;
const float dt = FAR/float(ITR);
const mat3 m3  = mat3( 0.00,  0.80,  0.60,
                      -0.80,  0.36, -0.48,
                      -0.60, -0.48,  0.64 );
const mat3 m3i = mat3( 0.00, -0.80, -0.60,
                       0.80,  0.36, -0.48,
                       0.60, -0.48,  0.64 );



/*//////////////////////////////////////////////////////
///// Light calculation functions
*///////////////////////////////////////////////////////

float F(vec3 wi, vec3 n) {
	//Calculate fresnel term F
	float R0 = material_fresnel;
	return R0 + (1.0 - R0) * pow(1.0 - dot(n, wi), 5.0);
}

float D(vec3 wi, vec3 wo, vec3 n) {
	//Calculate microfacet distribution term D
	vec3 wh = normalize(wi + wo);		//half-angle between inc- and out. directions
	float s = material_shininess;
	return ((s + 2) / (2 * PI)) * (pow(dot(n, wh), s));
}

float G(vec3 wi, vec3 wo, vec3 n) {
	vec3 wh = normalize(wi + wo);		//half-angle between inc- and out. directions
	//Calculate the masking term G
	float term1 = dot(n, wh)*dot(n, wo) / dot(wo, wh);
	float term2 = dot(n, wh)*dot(n, wi) / dot(wo, wh);
	return min(1, min(2 * term1, 2 * term2));
}

vec3 calculateDirectIllumiunation(vec3 wo, vec3 n) {
	///////////////////////////////////////////////////////////////////////////
	// Task 1.2 - Calculate the radiance Li from the light, and the direction
	//            to the light. If the light is backfacing the triangle, 
	//            return vec3(0); 
	///////////////////////////////////////////////////////////////////////////
	vec3 wi = normalize(-eye + sun_dir); // uses position but we have sun...
	float liCond = dot(wi, n);
	if (liCond <= 0)	return vec3(0);
	// Disregard distance to directional light!
	vec3 Li = sun_intensity * sun_color;

	///////////////////////////////////////////////////////////////////////////
	// Task 1.3 - Calculate the diffuse term and return that as the result
	///////////////////////////////////////////////////////////////////////////
	vec3 diffuseBRDF = material_color / PI ;
	vec3 diffuse_term = diffuseBRDF *  abs(liCond) * Li;

	///////////////////////////////////////////////////////////////////////////
	// Task 2 - Calculate the Torrance Sparrow BRDF and return the light 
	//          reflected from that instead
	///////////////////////////////////////////////////////////////////////////
	
	float F = F(wi, n);
	float D = D(wi, wo, n);
	float G = G(wi, wo, n);

	// Create the microfacet term with BRDF
	float brdf = (F*D*G) / (4 * dot(n, wo)*dot(n, wi));
	vec3 brdf_light = brdf * dot(n, wi) * Li;
 

	///////////////////////////////////////////////////////////////////////////
	// Task 3 - Make your shader respect the parameters of our material model.
	///////////////////////////////////////////////////////////////////////////
	float m = material_metalness;
	float r = material_reflectivity;

	vec3 dielectric_term = (brdf * dot(n,wi)*Li) + ((1 - F) * diffuse_term);
	vec3 metal_term = brdf * material_color * dot(n, wi) * Li;
	vec3 microfacet_term = m * metal_term + (1 - m) * dielectric_term;
	vec3 light = (r * microfacet_term) + ((1 - r) * diffuse_term);
	return light;
}
//SAFE COPY
// vec3 calculateDirectIllumiunation(vec3 wo, vec3 n) {
// 	///////////////////////////////////////////////////////////////////////////
// 	// Task 1.2 - Calculate the radiance Li from the light, and the direction
// 	//            to the light. If the light is backfacing the triangle, 
// 	//            return vec3(0); 
// 	///////////////////////////////////////////////////////////////////////////
// 	vec3 wi = normalize(-viewSpacePosition + viewSpaceLightPosition);
// 	float liCond = dot(wi, n);
// 	if (liCond <= 0)	return vec3(0);
// 	float d = distance(viewSpaceLightPosition, viewSpacePosition );
// 	vec3 Li = point_light_intensity_multiplier * point_light_color * (1.0 / (d*d));

// 	///////////////////////////////////////////////////////////////////////////
// 	// Task 1.3 - Calculate the diffuse term and return that as the result
// 	///////////////////////////////////////////////////////////////////////////
// 	vec3 diffuseBRDF = material_color / PI ;
// 	vec3 diffuse_term = diffuseBRDF *  abs(liCond) * Li;

// 	///////////////////////////////////////////////////////////////////////////
// 	// Task 2 - Calculate the Torrance Sparrow BRDF and return the light 
// 	//          reflected from that instead
// 	///////////////////////////////////////////////////////////////////////////
	
// 	float F = F(wi, n);
// 	float D = D(wi, wo, n);
// 	float G = G(wi, wo, n);

// 	// Create the microfacet term with BRDF
// 	float brdf = (F*D*G) / (4 * dot(n, wo)*dot(n, wi));
// 	vec3 brdf_light = brdf * dot(n, wi) * Li;
 

// 	///////////////////////////////////////////////////////////////////////////
// 	// Task 3 - Make your shader respect the parameters of our material model.
// 	///////////////////////////////////////////////////////////////////////////
// 	float m = material_metalness;
// 	float r = material_reflectivity;

// 	vec3 dielectric_term = (brdf * dot(n,wi)*Li) + ((1 - F) * diffuse_term);
// 	vec3 metal_term = brdf * material_color * dot(n, wi) * Li;
// 	vec3 microfacet_term = m * metal_term + (1 - m) * dielectric_term;
// 	vec3 light = (r * microfacet_term) + ((1 - r) * diffuse_term);
// 	return light;
// }

// vec2 toSpherical(vec3 dir) {
// 	// Calculate the spherical coordinates of the direction
// 	float theta = acos(max(-1.0f, min(1.0f, dir.y)));
// 	float phi = atan(dir.z, dir.x);
// 	if (phi < 0.0f) phi = phi + 2.0f * PI;
// 	return vec2(phi / (2.0 *PI), theta / PI);
// }

// vec3 calculateIndirectIllumination(vec3 wo, vec3 n) {
// 	///////////////////////////////////////////////////////////////////////////
// 	// Task 5 - Lookup the irradiance from the irradiance map and calculate
// 	//          the diffuse reflection
// 	///////////////////////////////////////////////////////////////////////////
// 	// Calculate the world-space direction from the camera to that position
// 	vec3 dir = normalize(viewInverse.xyz * n);
// 	vec2 lookup = toSpherical(dir);
// 	vec4 irradiance = environment_multiplier * texture(irradianceMap, lookup);
// 	vec3 diffuse_term = material_color * (1.0 / PI) * irradiance.xyz;


// 	///////////////////////////////////////////////////////////////////////////
// 	// Task 6 - Look up in the reflection map from the perfect specular 
// 	//          direction and calculate the dielectric and metal terms. 
// 	///////////////////////////////////////////////////////////////////////////
// 	vec3 wi = reflect(-wo, n);

// 	float s = material_shininess;
// 	float roughness = sqrt(sqrt(2 / (s + 2)));
	
// 	float F = F(wi, n); // view space
// 	mat3 transformation = mat3(viewInverse);
// 	wi = normalize(transformation * wi);
// 	vec2 lookup2 = toSpherical(wi);
	
// 	vec3 Li = environment_multiplier * textureLod(reflectionMap, lookup2, roughness * 7.0).xyz;
	
// 	float m = material_metalness;
// 	float r = material_reflectivity;
// 	vec3 dielectric_term = F * Li + (1 - F) * diffuse_term;
// 	vec3 metal_term = F * material_color * Li;
// 	vec3 microfacet_term = m * metal_term + (1 - m) * dielectric_term;
// 	vec3 derp = r * microfacet_term + (1 - r) * diffuse_term;
// 	return derp;
// }

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
                      2.0 * du * vec3( k1 + k4 * u.y + k6 * u.z + k7 * u.y * u.z,
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

    float frequency = 2.0;
    float gain = 0.5;
    float value = 0.0;
    float amplitude = 0.5;
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

void raymarch(vec3 ro, vec3 rd, out float ctr,  out float t, out vec3 derivative) {
	// March.
	for( int i = 0 ; i < ITR; i++ ) {
        // New position.
        vec3 pos = ro + t * rd;
        // Calculate sdf.
        // Find fbm and derivatives:
        vec4 fbm_noise = fbm_4(pos);
        float sdf_noise  = fbm_noise.x * 0.5 + 0.5; // Four layers of noise.. mapped from (-1, 1) -> (0,1)
        float sdf_floor  = pos.y + 0.6;
        float sdf_val    = sdf_floor + sdf_noise;
        //float sdf_sphere = length(vec3(0.0) - pos); // Radius 1, center at (0,0,0)
        //float sdf_val    = sdf_sphere * sdf_noise;

        // Iso-level check.d
		if ( sdf_val < ground_threshold ) {
			derivative = fbm_noise.yzw;
			break;
		};
       	
        // Step forward and increment debug ctr.
        t   += dt;
        ctr += 1.0;
	}
	
}

vec3 terrainNormal(vec3 v1) {
	vec3 v2 = { 0,0,0 };
	v2.x = v1.x;
	v2.y = v1.y;
	v2.z = 1;

	// if (length(v2) == 0) {
	// 	v2.x = -v1.y - v1.z;
	// 	v2.y = v1.x;
	// 	v2.z = v1.x;
	// }
	return normalize(v2);
}

void shade (vec3 ro, vec3 rd) {
	//Perform raymarching
  	float ctr = 0.0;
  	vec3 derivative = vec3(0.0);
  	float t = 0;
    raymarch(ro, rd, ctr, t, derivative);

    vec3 normal = terrainNormal(derivative);
    // Shade.
	
	// fragmentColor = vec4(vec3(ctr / float(ITR)), 1.0);
    // do amazing visuals
    vec3 color = calculateDirectIllumiunation(-normalize(ro + rd * t), normal) + 0.8*vec3((ctr / float(ITR))*0.8, (ctr / float(ITR)),(ctr / float(ITR)));;

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
	


