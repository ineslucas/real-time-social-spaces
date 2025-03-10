uniform vec2 uResolution;
uniform sampler2D uDisplacementTexture;
uniform sampler2D uPictureTexture; // Retrieving the uPictureTexture as a sampler2D

attribute float aIntensity;
attribute float aAngle;

varying vec3 vColor; // Creating a vec3 vColor varying and assign it the pictureIntensity:

// ✅

void main()
{
    // Displacement animation!
    vec3 newPosition = position;
    float displacementIntensity = texture(uDisplacementTexture, uv).r;
    displacementIntensity = smoothstep(0.1, 0.3, displacementIntensity);

    vec3 displacement = vec3(
        cos(aAngle) * 0.2,
        sin(aAngle) * 0.2,
        1.0
    );

    displacement = normalize(displacement);
    displacement *= displacementIntensity;
    displacement *= 3.0;
    displacement *= aIntensity;

    newPosition += displacement;

    // Final position
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // Picture
      // Using the texture() function to pick the color from uPictureTexture at the uv coordinates and swizzle the r channel to save it in a float pictureIntensity variable:
    float pictureIntensity = texture(uPictureTexture, uv).r;

    // Point size
      // Use the pictureIntensity to multiply the gl_PointSize
    gl_PointSize = 0.15 * pictureIntensity * uResolution.y;
      // 0.15 is the size of the particles
    gl_PointSize *= (1.0 / - viewPosition.z);

    // Varyings
    // vColor = vec3(pictureIntensity);
    vColor = vec3(pow(pictureIntensity, 2.0)); // use a pow on the pictureIntensity
}
