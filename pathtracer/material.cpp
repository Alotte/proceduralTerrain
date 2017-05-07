class Material {
    public:

    vec3 material_color;
    float material_reflectivity;
    float material_metalness;
    float material_fresnel;
    float material_shininess;
    float material_emission;
    std::string name;

    Material( float material_reflectivity1, float material_metalness1,
              float material_fresnel1,    float material_shininess1,
              float material_emission1) :  
        material_reflectivity(material_reflectivity1),
        material_metalness(material_reflectivity1),
        material_fresnel(material_fresnel1),
        material_shininess(material_shininess1),
        material_emission(material_emission1),
        material_color(0.9, 0.7,0.1) {}

        Material( float material_reflectivity1, float material_metalness1,
              float material_fresnel1,    float material_shininess1,
              float material_emission1, vec3 material_color1) :  
        material_reflectivity(material_reflectivity1),
        material_metalness(material_reflectivity1),
        material_fresnel(material_fresnel1),
        material_shininess(material_shininess1),
        material_emission(material_emission1),
        material_color(material_color1) {}



    Material() :  
            material_reflectivity(0.1),
            material_metalness(0.1),
            material_fresnel(0.1),
            material_shininess(0.1),
            material_emission(0.1),
            material_color(0.9, 0.7,0.1){}

};