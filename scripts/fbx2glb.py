"""Convert FBX to GLB using Blender's Python API (background mode)."""
import bpy, sys, os

src = r"C:\Users\Lenovo\Desktop\no_collision02.fbx"
dst = r"C:\Users\Lenovo\Desktop\挖宝3\models\zone0-decor-nc02.glb"

# Reset to empty scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Import FBX
bpy.ops.import_scene.fbx(filepath=src)

# Export GLB (binary glTF, no extras)
bpy.ops.export_scene.gltf(
    filepath=dst,
    export_format='GLB',
    export_apply=True,
    export_yup=True,
    export_animations=False,
    export_lights=False,
    export_cameras=False,
)

print(f"DONE: {dst}")