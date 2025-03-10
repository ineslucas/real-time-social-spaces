// Retrieving the vColor varying and set it on the first three values of gl_FragColor:
varying vec3 vColor;

void main()
{
    vec2 uv = gl_PointCoord;
    // Save the distance between the uv and vec2(0.5) in a variable
    // float distanceToCenter = distance(uv, vec2(0.5));

    float distanceToCenter = length(uv - vec2(0.5)); // Option 2 to get the distance to the center
    // gl_FragColor = vec4(distanceToCenter, distanceToCenter, distanceToCenter, 1.0);

    if(distanceToCenter > 0.5)
        discard;

    // gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    gl_FragColor = vec4(vColor, 1.0);

    // Base code
    // gl_FragColor = vec4(strength, 0.0, 0.0, 1.0);
    // gl_FragColor = vec4(uv, 1.0, 1.0); // Color effect
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
