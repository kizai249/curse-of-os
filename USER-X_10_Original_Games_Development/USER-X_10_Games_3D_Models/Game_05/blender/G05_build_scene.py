"""Blender G05 SILENT PAIR — rebuilds the USER-X concept blockout (meters, Z-up).
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
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,0.000,-0.005)); o=bpy.context.object; o.scale=(6.000,5.000,0.010); put(o,'floor_area',(0.141, 0.141, 0.173, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,-2.470,0.003)); o=bpy.context.object; o.scale=(6.000,0.060,0.005); put(o,'safety_border_s',(1.0, 0.831, 0.0, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,2.470,0.003)); o=bpy.context.object; o.scale=(6.000,0.060,0.005); put(o,'safety_border_n',(1.0, 0.831, 0.0, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-2.970,0.000,0.003)); o=bpy.context.object; o.scale=(0.060,5.000,0.005); put(o,'safety_border_w',(1.0, 0.831, 0.0, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(2.970,0.000,0.003)); o=bpy.context.object; o.scale=(0.060,5.000,0.005); put(o,'safety_border_e',(1.0, 0.831, 0.0, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,0.000,0.900)); o=bpy.context.object; o.scale=(3.600,0.050,1.800); put(o,'partition_frame',(0.063, 0.063, 0.078, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,0.000,1.100)); o=bpy.context.object; o.scale=(1.000,0.060,0.400); put(o,'partition_print',(0.553, 0.6, 0.682, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.900,-0.400,0.370)); o=bpy.context.object; o.scale=(1.800,0.600,0.740); put(o,'booth_table_-1_-0.9',(0.902, 0.902, 0.902, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.900,-0.400,0.370)); o=bpy.context.object; o.scale=(1.800,0.600,0.740); put(o,'booth_table_-1_0.9',(0.902, 0.902, 0.902, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-1.440,-0.350,0.790)); o=bpy.context.object; o.scale=(0.200,0.150,0.100); put(o,'choice_box_-1_0',(0.69, 0.537, 0.408, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-1.080,-0.400,1.040)); o=bpy.context.object; o.scale=(0.010,0.600,0.600); put(o,'booth_divider_-1_0',(0.784, 0.784, 0.816, 0.8))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(-1.440,-1.050,0.725)); put(bpy.context.object,'player_-1_0_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(-1.440,-1.050,1.730)); put(bpy.context.object,'player_-1_0_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.720,-0.350,0.790)); o=bpy.context.object; o.scale=(0.200,0.150,0.100); put(o,'choice_box_-1_1',(0.69, 0.537, 0.408, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.360,-0.400,1.040)); o=bpy.context.object; o.scale=(0.010,0.600,0.600); put(o,'booth_divider_-1_1',(0.784, 0.784, 0.816, 0.8))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(-0.720,-1.050,0.725)); put(bpy.context.object,'player_-1_1_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(-0.720,-1.050,1.730)); put(bpy.context.object,'player_-1_1_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,-0.350,0.790)); o=bpy.context.object; o.scale=(0.200,0.150,0.100); put(o,'choice_box_-1_2',(0.69, 0.537, 0.408, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.360,-0.400,1.040)); o=bpy.context.object; o.scale=(0.010,0.600,0.600); put(o,'booth_divider_-1_2',(0.784, 0.784, 0.816, 0.8))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(0.000,-1.050,0.725)); put(bpy.context.object,'player_-1_2_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(0.000,-1.050,1.730)); put(bpy.context.object,'player_-1_2_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.720,-0.350,0.790)); o=bpy.context.object; o.scale=(0.200,0.150,0.100); put(o,'choice_box_-1_3',(0.69, 0.537, 0.408, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.080,-0.400,1.040)); o=bpy.context.object; o.scale=(0.010,0.600,0.600); put(o,'booth_divider_-1_3',(0.784, 0.784, 0.816, 0.8))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(0.720,-1.050,0.725)); put(bpy.context.object,'player_-1_3_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(0.720,-1.050,1.730)); put(bpy.context.object,'player_-1_3_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.440,-0.350,0.790)); o=bpy.context.object; o.scale=(0.200,0.150,0.100); put(o,'choice_box_-1_4',(0.69, 0.537, 0.408, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(1.440,-1.050,0.725)); put(bpy.context.object,'player_-1_4_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(1.440,-1.050,1.730)); put(bpy.context.object,'player_-1_4_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.900,0.400,0.370)); o=bpy.context.object; o.scale=(1.800,0.600,0.740); put(o,'booth_table_1_-0.9',(0.902, 0.902, 0.902, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.900,0.400,0.370)); o=bpy.context.object; o.scale=(1.800,0.600,0.740); put(o,'booth_table_1_0.9',(0.902, 0.902, 0.902, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-1.440,0.350,0.790)); o=bpy.context.object; o.scale=(0.200,0.150,0.100); put(o,'choice_box_1_0',(0.69, 0.537, 0.408, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-1.080,0.400,1.040)); o=bpy.context.object; o.scale=(0.010,0.600,0.600); put(o,'booth_divider_1_0',(0.784, 0.784, 0.816, 0.8))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(-1.440,1.050,0.725)); put(bpy.context.object,'player_1_0_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(-1.440,1.050,1.730)); put(bpy.context.object,'player_1_0_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.720,0.350,0.790)); o=bpy.context.object; o.scale=(0.200,0.150,0.100); put(o,'choice_box_1_1',(0.69, 0.537, 0.408, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.360,0.400,1.040)); o=bpy.context.object; o.scale=(0.010,0.600,0.600); put(o,'booth_divider_1_1',(0.784, 0.784, 0.816, 0.8))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(-0.720,1.050,0.725)); put(bpy.context.object,'player_1_1_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(-0.720,1.050,1.730)); put(bpy.context.object,'player_1_1_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,0.350,0.790)); o=bpy.context.object; o.scale=(0.200,0.150,0.100); put(o,'choice_box_1_2',(0.69, 0.537, 0.408, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.360,0.400,1.040)); o=bpy.context.object; o.scale=(0.010,0.600,0.600); put(o,'booth_divider_1_2',(0.784, 0.784, 0.816, 0.8))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(0.000,1.050,0.725)); put(bpy.context.object,'player_1_2_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(0.000,1.050,1.730)); put(bpy.context.object,'player_1_2_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.720,0.350,0.790)); o=bpy.context.object; o.scale=(0.200,0.150,0.100); put(o,'choice_box_1_3',(0.69, 0.537, 0.408, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.080,0.400,1.040)); o=bpy.context.object; o.scale=(0.010,0.600,0.600); put(o,'booth_divider_1_3',(0.784, 0.784, 0.816, 0.8))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(0.720,1.050,0.725)); put(bpy.context.object,'player_1_3_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(0.720,1.050,1.730)); put(bpy.context.object,'player_1_3_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.440,0.350,0.790)); o=bpy.context.object; o.scale=(0.200,0.150,0.100); put(o,'choice_box_1_4',(0.69, 0.537, 0.408, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(1.440,1.050,0.725)); put(bpy.context.object,'player_1_4_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(1.440,1.050,1.730)); put(bpy.context.object,'player_1_4_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cube_add(size=1, location=(2.600,0.000,1.250)); o=bpy.context.object; o.scale=(0.050,1.200,0.900); put(o,'reputation_board',(0.953, 0.937, 0.902, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(2.600,0.000,0.400)); o=bpy.context.object; o.scale=(0.050,0.900,0.800); put(o,'reputation_board_easel',(0.718, 0.737, 0.769, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.180, depth=0.750, location=(-2.600,-0.600,0.375)); put(bpy.context.object,'jury_stool_0',(0.227, 0.227, 0.267, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.180, depth=0.750, location=(-2.600,0.000,0.375)); put(bpy.context.object,'jury_stool_1',(0.227, 0.227, 0.267, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.180, depth=0.750, location=(-2.600,0.600,0.375)); put(bpy.context.object,'jury_stool_2',(0.227, 0.227, 0.267, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(2.300,-0.700,0.725)); put(bpy.context.object,'operator_body',(0.553, 0.6, 0.682, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(2.300,-0.700,1.730)); put(bpy.context.object,'operator_head',(0.553, 0.6, 0.682, 0.45))
bpy.ops.object.camera_add(location=(5.40,-5.50,4.80), rotation=(math.radians(58),0,math.radians(40)))
bpy.context.scene.camera = bpy.context.object
bpy.ops.object.light_add(type='SUN', location=(0,0,10)); bpy.context.object.data.energy = 3
bpy.context.scene.render.filepath = '//G05_blender_render.png'
