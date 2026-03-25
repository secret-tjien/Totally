// import Phaser from 'phaser';

import { GameConfig } from '../config.js';

const fragShader = `
#define SHOCKWAVE_COUNT 20

precision mediump float;

uniform sampler2D uMainSampler;
uniform vec2 uResolution;
uniform vec2 uGameResolution;
uniform vec4 uShockwaves[20]; // x, y, time (0 to 1), scale for each wave
uniform int uActiveShockwaves;

varying vec2 outTexCoord;

void main(void) {
    vec2 uv = outTexCoord;
    vec2 texCoord = uv;
    vec2 caOffset = vec2(0.0);
    
    for(int i = 0; i < SHOCKWAVE_COUNT; i++) {
        if(i < uActiveShockwaves) {
            float cx = uShockwaves[i].x;
            float cy = uShockwaves[i].y;
            float time = uShockwaves[i].z;
            float scale = uShockwaves[i].w;
            
            // Convert center to UV space (cx, cy are now passed as UV coordinates directly)
            vec2 center = vec2(cx, cy);
            
            // Correct for aspect ratio
            vec2 diff = uv - center;
            diff.x *= uResolution.x / uResolution.y;
            
            float dist = length(diff);
            
            float radius = time * 0.48 * scale; // max radius scaled
            float thickness = 0.06 * scale; // thickness scaled
            
            float distFromRing = dist - radius;
            if(abs(distFromRing) < thickness) {
                float force = sin((distFromRing / thickness) * 3.14159) * 0.03 * scale * (1.0 - time); // force scaled
                vec2 dir = normalize(uv - center);
                texCoord += dir * force;
                caOffset += dir * force * 0.15; // 15% chromatic aberration
            }
        }
    }
    
    if (length(caOffset) > 0.0) {
        float r = texture2D(uMainSampler, texCoord - caOffset).r;
        float g = texture2D(uMainSampler, texCoord).g;
        float b = texture2D(uMainSampler, texCoord + caOffset).b;
        float a = texture2D(uMainSampler, texCoord).a;
        gl_FragColor = vec4(r, g, b, a);
    } else {
        gl_FragColor = texture2D(uMainSampler, texCoord);
    }
}
`;

export default class ShockwavePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({
            game,
            name: 'Shockwave',
            fragShader
        });
        
        this.shockwaves = [];
        this.maxWaves = 20;
        this.shockwavesData = new Float32Array(20 * 4);
    }

    onPreRender() {
        this.set1i('uActiveShockwaves', this.shockwaves.length);
        
        for (let i = 0; i < 20; i++) {
            if (i < this.shockwaves.length) {
                this.shockwavesData[i * 4 + 0] = this.shockwaves[i].x;
                this.shockwavesData[i * 4 + 1] = this.shockwaves[i].y;
                this.shockwavesData[i * 4 + 2] = this.shockwaves[i].time;
                this.shockwavesData[i * 4 + 3] = this.shockwaves[i].scale;
            } else {
                this.shockwavesData[i * 4 + 0] = 0;
                this.shockwavesData[i * 4 + 1] = 0;
                this.shockwavesData[i * 4 + 2] = 0;
                this.shockwavesData[i * 4 + 3] = 0;
            }
        }
        this.set4fv('uShockwaves', this.shockwavesData);
        
        this.set2f('uResolution', this.renderer.width, this.renderer.height);
        this.set2f('uGameResolution', GameConfig.width, GameConfig.height);
    }
    
    addShockwave(x, y, scale = 1.0) {
        const wave = { x, y, time: 0, scale };
        if (this.maxWaves <= 0) return wave;
        
        if (this.shockwaves.length >= this.maxWaves) {
            this.shockwaves.shift(); // Remove oldest if we hit the limit
        }
        this.shockwaves.push(wave);
        return wave;
    }
    
    removeShockwave(wave) {
        const index = this.shockwaves.indexOf(wave);
        if (index !== -1) {
            this.shockwaves.splice(index, 1);
        }
    }
}
