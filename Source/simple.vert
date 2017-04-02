#version 420
// This vertex shader simply outputs the input coordinates to the rasterizer. It only uses 2D coordinates.
layout(location = 0) in vec2 position;
uniform mat4 modelViewProjectionMatrix;
smooth out vec2 uv;

void main() {
	gl_Position = /*modelViewProjectionMatrix * */vec4(position.x, position.y, 0, 1);
	//uv = 0.5 * (position + vec2(1,1));
	uv = position;
}