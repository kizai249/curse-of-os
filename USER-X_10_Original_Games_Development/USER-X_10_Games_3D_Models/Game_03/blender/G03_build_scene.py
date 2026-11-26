"""Blender G03 THE RUN — rebuilds the USER-X concept blockout (meters, Z-up).
Generated from scenes.py. NOT executed in Blender inside the build environment;
run in Blender 3.6+/4.x: Scripting tab > Open > Run Script.
"""
import bpy, math
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, rgba):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = rgba
    if rgba[3] < 1:
        b.inputs['Alpha'].default_value = rgba[3]
        m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else None
    return m
def put(o, name, rgba):
    o.name = name; o.data.materials.append(mat(name + '_m', rgba))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,0.000,-0.005)); o=bpy.context.object; o.scale=(7.000,7.000,0.010); put(o,'floor_area',(0.141, 0.141, 0.173, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,-3.470,0.003)); o=bpy.context.object; o.scale=(7.000,0.060,0.005); put(o,'safety_border_s',(1.0, 0.831, 0.0, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,3.470,0.003)); o=bpy.context.object; o.scale=(7.000,0.060,0.005); put(o,'safety_border_n',(1.0, 0.831, 0.0, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-3.470,0.000,0.003)); o=bpy.context.object; o.scale=(0.060,7.000,0.005); put(o,'safety_border_w',(1.0, 0.831, 0.0, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(3.470,0.000,0.003)); o=bpy.context.object; o.scale=(0.060,7.000,0.005); put(o,'safety_border_e',(1.0, 0.831, 0.0, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-1.800,-1.800,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_0',(0.231, 0.259, 0.322, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-1.800,-1.200,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_1',(0.184, 0.204, 0.251, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-1.800,-0.600,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_2',(0.231, 0.259, 0.322, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-1.800,-0.000,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_3',(0.91, 0.725, 0.192, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-1.800,0.600,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_4',(0.231, 0.259, 0.322, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-1.800,1.200,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_5',(0.184, 0.204, 0.251, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-1.800,1.800,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_6',(0.231, 0.259, 0.322, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-1.200,-1.800,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_7',(0.184, 0.204, 0.251, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-1.200,1.800,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_8',(0.231, 0.259, 0.322, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.600,-1.800,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_9',(0.184, 0.204, 0.251, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.600,1.800,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_10',(0.231, 0.259, 0.322, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.000,-1.800,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_11',(0.91, 0.725, 0.192, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.000,1.800,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_12',(0.91, 0.725, 0.192, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.600,-1.800,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_13',(0.184, 0.204, 0.251, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.600,1.800,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_14',(0.231, 0.259, 0.322, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.200,-1.800,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_15',(0.184, 0.204, 0.251, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.200,1.800,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_16',(0.231, 0.259, 0.322, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.800,-1.800,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_17',(0.184, 0.204, 0.251, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.800,-1.200,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_18',(0.231, 0.259, 0.322, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.800,-0.600,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_19',(0.184, 0.204, 0.251, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.800,-0.000,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_20',(0.91, 0.725, 0.192, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.800,0.600,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_21',(0.184, 0.204, 0.251, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.800,1.200,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_22',(0.231, 0.259, 0.322, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.800,1.800,0.010)); o=bpy.context.object; o.scale=(0.580,0.580,0.020); put(o,'track_square_23',(0.184, 0.204, 0.251, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-2.850,-2.850,0.010)); o=bpy.context.object; o.scale=(1.200,1.200,0.020); put(o,'home_base_0',(0.902, 0.224, 0.275, 0.9))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(-2.850,-2.850,0.725)); put(bpy.context.object,'player_home_0_body',(0.902, 0.224, 0.275, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(-2.850,-2.850,1.730)); put(bpy.context.object,'player_home_0_head',(0.902, 0.224, 0.275, 0.45))
bpy.ops.mesh.primitive_cube_add(size=1, location=(2.850,-2.850,0.010)); o=bpy.context.object; o.scale=(1.200,1.200,0.020); put(o,'home_base_1',(1.0, 0.765, 0.0, 0.9))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(2.850,-2.850,0.725)); put(bpy.context.object,'player_home_1_body',(1.0, 0.765, 0.0, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(2.850,-2.850,1.730)); put(bpy.context.object,'player_home_1_head',(1.0, 0.765, 0.0, 0.45))
bpy.ops.mesh.primitive_cube_add(size=1, location=(2.850,2.850,0.010)); o=bpy.context.object; o.scale=(1.200,1.200,0.020); put(o,'home_base_2',(0.024, 0.839, 0.627, 0.9))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(2.850,2.850,0.725)); put(bpy.context.object,'player_home_2_body',(0.024, 0.839, 0.627, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(2.850,2.850,1.730)); put(bpy.context.object,'player_home_2_head',(0.024, 0.839, 0.627, 0.45))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-2.850,2.850,0.010)); o=bpy.context.object; o.scale=(1.200,1.200,0.020); put(o,'home_base_3',(0.298, 0.788, 0.941, 0.9))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(-2.850,2.850,0.725)); put(bpy.context.object,'player_home_3_body',(0.298, 0.788, 0.941, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(-2.850,2.850,1.730)); put(bpy.context.object,'player_home_3_head',(0.298, 0.788, 0.941, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(-0.600,-1.800,0.725)); put(bpy.context.object,'pawn_0_body',(0.902, 0.224, 0.275, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(-0.600,-1.800,1.730)); put(bpy.context.object,'pawn_0_head',(0.902, 0.224, 0.275, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(1.800,-0.600,0.725)); put(bpy.context.object,'pawn_1_body',(1.0, 0.765, 0.0, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(1.800,-0.600,1.730)); put(bpy.context.object,'pawn_1_head',(1.0, 0.765, 0.0, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(0.600,1.800,0.725)); put(bpy.context.object,'pawn_2_body',(0.024, 0.839, 0.627, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(0.600,1.800,1.730)); put(bpy.context.object,'pawn_2_head',(0.024, 0.839, 0.627, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(-1.800,0.600,0.725)); put(bpy.context.object,'pawn_3_body',(0.298, 0.788, 0.941, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(-1.800,0.600,1.730)); put(bpy.context.object,'pawn_3_head',(0.298, 0.788, 0.941, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.600, depth=0.150, location=(0.000,0.000,0.075)); put(bpy.context.object,'dice_arena',(0.227, 0.227, 0.267, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.500, depth=0.155, location=(0.000,0.000,0.077)); put(bpy.context.object,'dice_arena_floor',(0.141, 0.141, 0.173, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.150,0.100,0.305)); o=bpy.context.object; o.scale=(0.300,0.300,0.300); put(o,'giant_die_0',(0.953, 0.937, 0.902, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.180,0.120,0.305)); o=bpy.context.object; o.scale=(0.300,0.300,0.300); put(o,'giant_die_1',(0.953, 0.937, 0.902, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,-0.200,0.305)); o=bpy.context.object; o.scale=(0.300,0.300,0.300); put(o,'giant_die_2',(0.953, 0.937, 0.902, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,-3.300,1.025)); o=bpy.context.object; o.scale=(1.200,0.050,0.850); put(o,'progress_board',(0.953, 0.937, 0.902, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,-3.300,0.300)); o=bpy.context.object; o.scale=(0.900,0.040,0.600); put(o,'progress_board_legs',(0.718, 0.737, 0.769, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(0.900,-3.200,0.725)); put(bpy.context.object,'operator_body',(0.298, 0.788, 0.941, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(0.900,-3.200,1.730)); put(bpy.context.object,'operator_head',(0.298, 0.788, 0.941, 0.45))
bpy.ops.object.camera_add(location=(6.30,-7.70,5.60), rotation=(math.radians(58),0,math.radians(40)))
bpy.context.scene.camera = bpy.context.object
bpy.ops.object.light_add(type='SUN', location=(0,0,10)); bpy.context.object.data.energy = 3
bpy.context.scene.render.filepath = '//G03_blender_render.png'
