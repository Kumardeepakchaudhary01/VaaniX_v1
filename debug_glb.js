const fs = require('fs');
try {
    const buffer = fs.readFileSync('public/models/avatar.glb');
    const jsonChunkLength = buffer.readUInt32LE(12);
    const jsonStr = buffer.toString('utf8', 20, 20 + jsonChunkLength);
    const gltf = JSON.parse(jsonStr);
    
    console.log('--- ALL NODE NAMES: ---');
    if (gltf.nodes) {
        console.log(gltf.nodes.map(n => n.name).filter(Boolean).join(', '));
    }
    
    console.log('\n--- MESH NAMES AND TARGETS: ---');
    if (gltf.meshes) {
        gltf.meshes.forEach((m, i) => {
            console.log(`Mesh ${i}: ${m.name}`);
            if (m.primitives && m.primitives[0].targets) {
                console.log(`TARGETS FOUND: ${m.primitives[0].targets.length}`);
            }
            if (m.extras && m.extras.targetNames) {
                console.log(`Target Names: ${m.extras.targetNames.join(', ')}`);
            }
        });
    }

    console.log('\n--- ANIMATIONS: ---');
    if (gltf.animations) {
        gltf.animations.forEach(a => console.log(a.name));
    }
} catch (e) {
    console.error('Error:', e);
}
