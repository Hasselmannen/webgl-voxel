function setDefined(text, define, string, value) {
    return text.replace(
        new RegExp("(#undef|#define)\\s+" + string + "( +\\S+)?"),
        (define ? "#define " : "#undef ") + string + (value != null ? " " + value : "")
    );
}

var inputNumGodRaySamples = document.getElementById("number-god-ray-samples");
var inputEnableGodRays    = document.getElementById("enable-god-rays"       );
var inputNumSSAOSamples   = document.getElementById("number-ssao-samples"   );
var inputEnableSSAO       = document.getElementById("enable-ssao"           );
var inputEnableParallax   = document.getElementById("enable-parallax"       );
var inputEnableNormalMap  = document.getElementById("enable-normal-mapping" );
var inputEnableDiffuse    = document.getElementById("enable-diffuse-texture");
var inputGodRayIntensity  = document.getElementById("god-ray-intensity"     );
var inputEnableMainLight  = document.getElementById("enable-main-light"     );
var inputEnableShadows    = document.getElementById("enable-shadows"        );
var inputNumberLights     = document.getElementById("number-extra-lights"   );
var inputRotationSpeed    = document.getElementById("light-rotation-speed"  );
var inputEnableRotation   = document.getElementById("enable-light-rotation" );

inputNumGodRaySamples.onchange = function() {
    shaders.deferred.fs = setDefined(shaders.deferred.fs, true,
                                     "NUM_CREPUSCULAR_SAMPLES",
                                     inputNumGodRaySamples.value);
    shaders.deferred.program = reloadShader(shaders.deferred);
}
inputEnableGodRays.onchange = function() {
    shaders.deferred.fs = setDefined(shaders.deferred.fs, inputEnableGodRays.checked, "CREPUSCULAR_RAYS");
    shaders.deferred.program = reloadShader(shaders.deferred);
}
inputGodRayIntensity.onchange = function() {
    godRayIntensity = inputGodRayIntensity.value;
}

function setSSAO(enable) {
    return setDefined(shaders.ssao.fs, enable, "ENABLE_SSAO");
}
inputNumSSAOSamples.onchange = function() {
    var value = inputNumSSAOSamples.value;
    numSSAOSamples = value;
    if (value == null || value <= 0) {
        shaders.ssao.fs = setSSAO(false);
    }
    else {
        shaders.ssao.fs = setSSAO(inputEnableSSAO.checked);
        shaders.ssao.fs = setDefined(shaders.ssao.fs, true, "NUM_SSAO_SAMPLES", value);
    }
    shaders.ssao.program = reloadShader(shaders.ssao);
}
inputEnableSSAO.onchange = function() {
    shaders.ssao.fs = setSSAO(inputEnableSSAO.checked && inputNumSSAOSamples.value > 0);
    shaders.ssao.program = reloadShader(shaders.ssao);
}

inputEnableParallax.onchange = function() {
    shaders.pre.fs = setDefined(shaders.pre.fs, inputEnableParallax.checked, "PARALLAX_MAPPING");
    shaders.pre.program = reloadShader(shaders.pre);
}

inputEnableNormalMap.onchange = function() {
    shaders.pre.fs = setDefined(shaders.pre.fs, inputEnableNormalMap.checked, "NORMAL_MAPPING");
    shaders.pre.program = reloadShader(shaders.pre);
}

inputEnableDiffuse.onchange = function() {
    shaders.pre.fs = setDefined(shaders.pre.fs, inputEnableDiffuse.checked, "DIFFUSE_TEXTURE");
    shaders.pre.program = reloadShader(shaders.pre);
}

inputEnableMainLight.onchange = function() {
    shaders.deferred.fs = setDefined(shaders.deferred.fs, inputEnableMainLight.checked, "MAIN_LIGHT");
    shaders.deferred.program = reloadShader(shaders.deferred);
    enableMainLight = inputEnableMainLight.checked;
}

inputEnableShadows.onchange = function() {
    shaders.deferred.fs = setDefined(shaders.deferred.fs, inputEnableShadows.checked, "SHADOWS");
    shaders.deferred.program = reloadShader(shaders.deferred);
    enableShadows = inputEnableShadows.checked;
}

inputNumberLights.onchange = function() {
    nrLights = Math.min(8, Math.max(0, inputNumberLights.value));
}

inputRotationSpeed.onchange = function() {
    lightRotationSpeed = Math.max(0, inputRotationSpeed.value);
}
inputEnableRotation.onchange = function() {
    enableLightRotation = inputEnableRotation.checked;
}
