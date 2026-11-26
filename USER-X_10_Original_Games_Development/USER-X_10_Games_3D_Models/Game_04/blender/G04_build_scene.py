"""Blender G04 HARAJ — rebuilds the USER-X concept blockout (meters, Z-up).
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
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,0.000,-0.005)); o=bpy.context.object; o.scale=(7.000,6.000,0.010); put(o,'floor_area',(0.141, 0.141, 0.173, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,-2.970,0.003)); o=bpy.context.object; o.scale=(7.000,0.060,0.005); put(o,'safety_border_s',(1.0, 0.831, 0.0, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,2.970,0.003)); o=bpy.context.object; o.scale=(7.000,0.060,0.005); put(o,'safety_border_n',(1.0, 0.831, 0.0, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-3.470,0.000,0.003)); o=bpy.context.object; o.scale=(0.060,6.000,0.005); put(o,'safety_border_w',(1.0, 0.831, 0.0, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(3.470,0.000,0.003)); o=bpy.context.object; o.scale=(0.060,6.000,0.005); put(o,'safety_border_e',(1.0, 0.831, 0.0, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,2.400,0.575)); o=bpy.context.object; o.scale=(0.700,0.500,1.150); put(o,'auctioneer_podium',(0.11, 0.11, 0.133, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.000,2.140,0.575)); o=bpy.context.object; o.scale=(0.600,0.020,0.850); put(o,'auctioneer_podium_front',(0.69, 0.537, 0.408, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.400,2.600,1.250)); o=bpy.context.object; o.scale=(1.200,0.050,0.900); put(o,'price_board',(0.953, 0.937, 0.902, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.400,2.600,0.400)); o=bpy.context.object; o.scale=(0.900,0.050,0.800); put(o,'price_board_easel',(0.718, 0.737, 0.769, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-2.269,1.492,0.450)); o=bpy.context.object; o.scale=(0.600,0.400,0.900); put(o,'souq_stall_crate_0',(0.69, 0.537, 0.408, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-2.269,1.492,1.025)); o=bpy.context.object; o.scale=(0.250,0.200,0.250); put(o,'asset_prop_0',(0.757, 0.071, 0.122, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-1.616,0.662,0.450)); o=bpy.context.object; o.scale=(0.600,0.400,0.900); put(o,'souq_stall_crate_1',(0.69, 0.537, 0.408, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-1.616,0.662,1.025)); o=bpy.context.object; o.scale=(0.250,0.200,0.250); put(o,'asset_prop_1',(0.957, 0.635, 0.38, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.584,0.191,0.450)); o=bpy.context.object; o.scale=(0.600,0.400,0.900); put(o,'souq_stall_crate_2',(0.69, 0.537, 0.408, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.584,0.191,1.025)); o=bpy.context.object; o.scale=(0.250,0.200,0.250); put(o,'asset_prop_2',(0.427, 0.349, 0.478, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.584,0.191,0.450)); o=bpy.context.object; o.scale=(0.600,0.400,0.900); put(o,'souq_stall_crate_3',(0.69, 0.537, 0.408, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.584,0.191,1.025)); o=bpy.context.object; o.scale=(0.250,0.200,0.250); put(o,'asset_prop_3',(0.165, 0.616, 0.561, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.616,0.662,0.450)); o=bpy.context.object; o.scale=(0.600,0.400,0.900); put(o,'souq_stall_crate_4',(0.69, 0.537, 0.408, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.616,0.662,1.025)); o=bpy.context.object; o.scale=(0.250,0.200,0.250); put(o,'asset_prop_4',(0.914, 0.769, 0.416, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(2.269,1.492,0.450)); o=bpy.context.object; o.scale=(0.600,0.400,0.900); put(o,'souq_stall_crate_5',(0.69, 0.537, 0.408, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(2.269,1.492,1.025)); o=bpy.context.object; o.scale=(0.250,0.200,0.250); put(o,'asset_prop_5',(0.149, 0.275, 0.325, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(3.000,0.000,0.370)); o=bpy.context.object; o.scale=(0.600,1.800,0.740); put(o,'bank_table',(0.902, 0.902, 0.902, 1.0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(3.000,0.400,0.890)); o=bpy.context.object; o.scale=(0.250,0.250,0.300); put(o,'sealed_bid_box',(0.867, 0.937, 1.0, 0.4))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(-2.000,0.200,0.725)); put(bpy.context.object,'trader_0_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(-2.000,0.200,1.730)); put(bpy.context.object,'trader_0_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.110, depth=0.010, location=(-1.750,0.200,1.305)); put(bpy.context.object,'bid_paddle_0',(0.953, 0.937, 0.902, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(-1.100,0.200,0.725)); put(bpy.context.object,'trader_1_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(-1.100,0.200,1.730)); put(bpy.context.object,'trader_1_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.110, depth=0.010, location=(-0.850,0.200,1.305)); put(bpy.context.object,'bid_paddle_1',(0.953, 0.937, 0.902, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(-0.200,0.200,0.725)); put(bpy.context.object,'trader_2_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(-0.200,0.200,1.730)); put(bpy.context.object,'trader_2_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.110, depth=0.010, location=(0.050,0.200,1.305)); put(bpy.context.object,'bid_paddle_2',(0.953, 0.937, 0.902, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(0.700,0.200,0.725)); put(bpy.context.object,'trader_3_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(0.700,0.200,1.730)); put(bpy.context.object,'trader_3_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.110, depth=0.010, location=(0.950,0.200,1.305)); put(bpy.context.object,'bid_paddle_3',(0.953, 0.937, 0.902, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(1.600,0.200,0.725)); put(bpy.context.object,'trader_4_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(1.600,0.200,1.730)); put(bpy.context.object,'trader_4_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.110, depth=0.010, location=(1.850,0.200,1.305)); put(bpy.context.object,'bid_paddle_4',(0.953, 0.937, 0.902, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(-2.000,-0.700,0.725)); put(bpy.context.object,'trader_5_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(-2.000,-0.700,1.730)); put(bpy.context.object,'trader_5_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.110, depth=0.010, location=(-1.750,-0.700,1.305)); put(bpy.context.object,'bid_paddle_5',(0.953, 0.937, 0.902, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(-1.100,-0.700,0.725)); put(bpy.context.object,'trader_6_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(-1.100,-0.700,1.730)); put(bpy.context.object,'trader_6_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.110, depth=0.010, location=(-0.850,-0.700,1.305)); put(bpy.context.object,'bid_paddle_6',(0.953, 0.937, 0.902, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(-0.200,-0.700,0.725)); put(bpy.context.object,'trader_7_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(-0.200,-0.700,1.730)); put(bpy.context.object,'trader_7_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.110, depth=0.010, location=(0.050,-0.700,1.305)); put(bpy.context.object,'bid_paddle_7',(0.953, 0.937, 0.902, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(0.700,-0.700,0.725)); put(bpy.context.object,'trader_8_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(0.700,-0.700,1.730)); put(bpy.context.object,'trader_8_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.110, depth=0.010, location=(0.950,-0.700,1.305)); put(bpy.context.object,'bid_paddle_8',(0.953, 0.937, 0.902, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(1.600,-0.700,0.725)); put(bpy.context.object,'trader_9_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(1.600,-0.700,1.730)); put(bpy.context.object,'trader_9_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.110, depth=0.010, location=(1.850,-0.700,1.305)); put(bpy.context.object,'bid_paddle_9',(0.953, 0.937, 0.902, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(0.000,2.850,0.725)); put(bpy.context.object,'auctioneer_body',(0.69, 0.537, 0.408, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(0.000,2.850,1.730)); put(bpy.context.object,'auctioneer_head',(0.69, 0.537, 0.408, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.200, depth=1.450, location=(3.450,0.000,0.725)); put(bpy.context.object,'banker_body',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.130, location=(3.450,0.000,1.730)); put(bpy.context.object,'banker_head',(0.541, 0.541, 0.588, 0.45))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.170, depth=0.450, location=(-2.083,-2.700,0.225)); put(bpy.context.object,'spectator_stool_0',(0.227, 0.227, 0.267, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.170, depth=0.450, location=(-1.250,-2.700,0.225)); put(bpy.context.object,'spectator_stool_1',(0.227, 0.227, 0.267, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.170, depth=0.450, location=(-0.417,-2.700,0.225)); put(bpy.context.object,'spectator_stool_2',(0.227, 0.227, 0.267, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.170, depth=0.450, location=(0.417,-2.700,0.225)); put(bpy.context.object,'spectator_stool_3',(0.227, 0.227, 0.267, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.170, depth=0.450, location=(1.250,-2.700,0.225)); put(bpy.context.object,'spectator_stool_4',(0.227, 0.227, 0.267, 1.0))
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.170, depth=0.450, location=(2.083,-2.700,0.225)); put(bpy.context.object,'spectator_stool_5',(0.227, 0.227, 0.267, 1.0))
bpy.ops.object.camera_add(location=(6.30,-6.60,5.60), rotation=(math.radians(58),0,math.radians(40)))
bpy.context.scene.camera = bpy.context.object
bpy.ops.object.light_add(type='SUN', location=(0,0,10)); bpy.context.object.data.energy = 3
bpy.context.scene.render.filepath = '//G04_blender_render.png'
