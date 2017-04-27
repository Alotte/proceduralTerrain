#version 420
// This vertex shader simply outputs the input coordinates to the rasterizer. It only uses 2D coordinates.
layout(location = 0) in vec2 position;
out vec2 fragCoord;

void main() {
	gl_Position = vec4(position.x, position.y, 0, 1);
	// fragCoord = 0.5 * (position + vec2(1,1));
	fragCoord = position;
}