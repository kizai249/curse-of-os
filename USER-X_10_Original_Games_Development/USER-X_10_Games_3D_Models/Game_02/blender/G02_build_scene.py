"""Blender G02 COUNTERFLOW — rebuilds the USER-X concept blockout (meters, Z-up).
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
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.300, depth=0.012, location=(0.000,-2.500,0.006)); put(bpy.context.object,'floor_station_disc_0',(0.902, 0.224, 0.275, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(0.000,-2.500,0.725)); put(bpy.context.object,'player_0_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(0.000,-2.500,1.730)); put(bpy.context.object,'player_0_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.300, depth=0.012, location=(1.250,-2.165,0.006)); put(bpy.context.object,'floor_station_disc_1',(1.0, 0.765, 0.0, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(1.250,-2.165,0.725)); put(bpy.context.object,'player_1_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(1.250,-2.165,1.730)); put(bpy.context.object,'player_1_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.300, depth=0.012, location=(2.165,-1.250,0.006)); put(bpy.context.object,'floor_station_disc_2',(0.024, 0.839, 0.627, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(2.165,-1.250,0.725)); put(bpy.context.object,'player_2_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(2.165,-1.250,1.730)); put(bpy.context.object,'player_2_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.300, depth=0.012, location=(2.500,0.000,0.006)); put(bpy.context.object,'floor_station_disc_3',(0.298, 0.788, 0.941, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(2.500,0.000,0.725)); put(bpy.context.object,'player_3_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(2.500,0.000,1.730)); put(bpy.context.object,'player_3_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.300, depth=0.012, location=(2.165,1.250,0.006)); put(bpy.context.object,'floor_station_disc_4',(0.902, 0.224, 0.275, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(2.165,1.250,0.725)); put(bpy.context.object,'player_4_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(2.165,1.250,1.730)); put(bpy.context.object,'player_4_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.300, depth=0.012, location=(1.250,2.165,0.006)); put(bpy.context.object,'floor_station_disc_5',(1.0, 0.765, 0.0, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(1.250,2.165,0.725)); put(bpy.context.object,'player_5_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(1.250,2.165,1.730)); put(bpy.context.object,'player_5_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.300, depth=0.012, location=(0.000,2.500,0.006)); put(bpy.context.object,'floor_station_disc_6',(0.024, 0.839, 0.627, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(0.000,2.500,0.725)); put(bpy.context.object,'player_6_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(0.000,2.500,1.730)); put(bpy.context.object,'player_6_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.300, depth=0.012, location=(-1.250,2.165,0.006)); put(bpy.context.object,'floor_station_disc_7',(0.298, 0.788, 0.941, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(-1.250,2.165,0.725)); put(bpy.context.object,'player_7_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(-1.250,2.165,1.730)); put(bpy.context.object,'player_7_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.300, depth=0.012, location=(-2.165,1.250,0.006)); put(bpy.context.object,'floor_station_disc_8',(0.902, 0.224, 0.275, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(-2.165,1.250,0.725)); put(bpy.context.object,'player_8_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(-2.165,1.250,1.730)); put(bpy.context.object,'player_8_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.300, depth=0.012, location=(-2.500,0.000,0.006)); put(bpy.context.object,'floor_station_disc_9',(1.0, 0.765, 0.0, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(-2.500,0.000,0.725)); put(bpy.context.object,'player_9_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(-2.500,0.000,1.730)); put(bpy.context.object,'player_9_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.300, depth=0.012, location=(-2.165,-1.250,0.006)); put(bpy.context.object,'floor_station_disc_10',(0.024, 0.839, 0.627, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.300, depth=0.012, location=(-1.250,-2.165,0.006)); put(bpy.context.object,'floor_station_disc_11',(0.298, 0.788, 0.941, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,0.000,0.600)); o=bpy.context.object; o.scale=(0.500,0.500,1.200); put(o,'discard_tower',(0.11, 0.11, 0.133, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,-0.255,0.700)); o=bpy.context.object; o.scale=(0.360,0.010,0.800); put(o,'discard_tower_window',(0.867, 0.937, 1.0, 0.35))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,-0.200,0.475)); o=bpy.context.object; o.scale=(0.120,0.180,0.350); put(o,'card_stack',(0.024, 0.839, 0.627, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=0.020, location=(0.000,0.000,1.210)); put(bpy.context.object,'direction_indicator',(0.024, 0.839, 0.627, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.020, depth=1.600, location=(-3.200,0.000,0.800)); put(bpy.context.object,'timer_stand',(0.718, 0.737, 0.769, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-3.200,0.000,1.700)); o=bpy.context.object; o.scale=(0.600,0.050,0.200); put(o,'led_timer',(0.067, 0.067, 0.067, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-3.200,-0.030,1.700)); o=bpy.context.object; o.scale=(0.450,0.010,0.100); put(o,'led_digits',(1.0, 0.231, 0.188, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.020, depth=1.600, location=(3.200,0.000,0.800)); put(bpy.context.object,'timer_stand',(0.718, 0.737, 0.769, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(3.200,0.000,1.700)); o=bpy.context.object; o.scale=(0.600,0.050,0.200); put(o,'led_timer',(0.067, 0.067, 0.067, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(3.200,-0.030,1.700)); o=bpy.context.object; o.scale=(0.450,0.010,0.100); put(o,'led_digits',(1.0, 0.231, 0.188, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,-3.200,0.550)); o=bpy.context.object; o.scale=(0.500,0.400,1.100); put(o,'operator_lectern',(0.11, 0.11, 0.133, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,-3.200,1.115)); o=bpy.context.object; o.scale=(0.550,0.450,0.030); put(o,'operator_lectern_top',(0.024, 0.839, 0.627, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.170, depth=0.450, location=(-2.083,3.200,0.225)); put(bpy.context.object,'spectator_stool_0',(0.227, 0.227, 0.267, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.170, depth=0.450, location=(-1.250,3.200,0.225)); put(bpy.context.object,'spectator_stool_1',(0.227, 0.227, 0.267, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.170, depth=0.450, location=(-0.417,3.200,0.225)); put(bpy.context.object,'spectator_stool_2',(0.227, 0.227, 0.267, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.170, depth=0.450, location=(0.417,3.200,0.225)); put(bpy.context.object,'spectator_stool_3',(0.227, 0.227, 0.267, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.170, depth=0.450, location=(1.250,3.200,0.225)); put(bpy.context.object,'spectator_stool_4',(0.227, 0.227, 0.267, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.170, depth=0.450, location=(2.083,3.200,0.225)); put(bpy.context.object,'spectator_stool_5',(0.227, 0.227, 0.267, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(0.000,-2.850,0.725)); put(bpy.context.object,'operator_body',(0.024, 0.839, 0.627, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(0.000,-2.850,1.730)); put(bpy.context.object,'operator_head',(0.024, 0.839, 0.627, 0.45))
bpy.ops.object.camera_add(location=(6.30,-7.70,5.60), rotation=(math.radians(58),0,math.radians(40)))
bpy.context.scene.camera = bpy.context.object
bpy.ops.object.light_add(type='SUN', location=(0,0,10)); bpy.context.object.data.energy = 3
bpy.context.scene.render.filepath = '//G02_blender_render.png'
