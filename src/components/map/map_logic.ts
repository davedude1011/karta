import { Delaunay } from "d3-delaunay";
import PoissonDiskSampling from "poisson-disk-sampling";
import { generate_filler_locations, generate_filler_locations_full_data, generate_special_locations, generate_special_locations_full_data, generate_world_lore, type WorldSettingsType, type LocationDataType } from "~/server/gemini/generate_location";
import { draw_location } from "./map_drawing";
import { send_message } from "../logic/event-messages";

export function get_centroid(points: [number, number][]): [number, number] {
    if (points.length === 0) return [0, 0];

    let sumX = 0;
    let sumY = 0;

    for (const [x, y] of points) {
        sumX += x;
        sumY += y;
    }

    const centroidX = sumX / points.length;
    const centroidY = sumY / points.length;

    return [centroidX, centroidY];
}

export function is_point_in_poligon(point: [number, number], polygon: [number, number][]): boolean {
    const [x, y] = point;
    let inside = false;

    // Loop through each edge of the polygon
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i]??[0,0];
        const [xj, yj] = polygon[j]??[0,0];

        // Check if the point is inside the polygon using the ray-casting method
        const intersect = yi > y !== yj > y && 
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        
        if (intersect) {
        inside = !inside; // Flip the inside status
        }
    }

    return inside;
}

export function generate_voronoi(
    width: number,
    height: number,
    pointCount: number,
    p = 2,
    randomness = 0
    ): [number, number][][] {
    function minkowski_transform(p: number, x: number, y: number): [number, number] {
        const scale = Math.pow(Math.pow(Math.abs(x), p) + Math.pow(Math.abs(y), p), 1 / p);
        return [(x / scale) * Math.abs(x), (y / scale) * Math.abs(y)];
    }

    // Calculate minDistance based on randomness: high randomness results in smaller minDistance (denser points)
    const minDistance = Math.max(5, width / Math.sqrt(pointCount)) - randomness;  // As randomness increases, minDistance decreases

    // Poisson-disc sampling for even point distribution
    const poisson = new PoissonDiskSampling({
        shape: [width, height],
        minDistance: minDistance, // Adjusting distance based on randomness
        tries: 30,
    });

    // Generate base points using Poisson-disc sampling
    const points = poisson.fill().slice(0, pointCount) as [number, number][];

    // Apply randomness factor by scaling points
    const transformedPoints = points.map(([x, y]) => {
        const randomScale = 1 + (Math.random() * randomness);  // Random scaling based on randomness value
        return minkowski_transform(p, (x - width / 2) * randomScale, (y - height / 2) * randomScale).map((v, i) => v + (i === 0 ? width / 2 : height / 2)) as [number, number];
    });

    // Generate Voronoi from transformed points
    const delaunay = Delaunay.from(transformedPoints);
    const voronoi = delaunay.voronoi([0, 0, width, height]);

    const cells: [number, number][][] = [];

    // Extract the cell polygons
    for (let i = 0; i < pointCount; i++) {
        const cell = voronoi.cellPolygon(i);
        if (cell) {
        cells.push(cell.map(([x, y]) => [x, y] as [number, number]));
        }
    }

    return cells;
}

export function generate_random_string(length: number) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        result += chars[randomIndex];
    }
    return result;
}

export async function generate_world_zone_table(zone_table: Record<string, LocationDataType>, ctx: CanvasRenderingContext2D, world_settings: WorldSettingsType) {
    generate_world_lore(world_settings.world_description)
        .then((world_lore) => {
            console.log(world_lore)
            send_message("add_to_world_logs", world_lore)

            world_settings.world_lore = world_lore

            let voronoi_locations = generate_voronoi(1000, 1000, 2000, 5, 10)
            const voronoi_locations_base_count = voronoi_locations.length

            generate_filler_locations(world_lore)
                .then((filler_locations) => {
                    if (filler_locations) {
                        send_message("add_to_world_logs", `${filler_locations.length} filler location ideas have been thought of: ${filler_locations.map((filler_location_data) => filler_location_data.location_type).join(", ")}.`)
                        
                        /*
                            now that we have the base names for each filler location, we can start the fetches for the
                            special locations, the filler location names are needed so that the ai can place the special
                            locations somewhere fitting their nature, to make the placement less random
                        */
                        const filler_location_names = filler_locations.map((filler_location_data) => filler_location_data.location_type)
                        generate_special_locations(world_lore)
                            .then((special_locations) => {
                                if (special_locations) {
                                    send_message("add_to_world_logs", `${special_locations.length} special location ideas have been thought of: ${special_locations.map((special_location_data) => special_location_data.location_type).join(", ")}.`)

                                    for (const special_location of special_locations) {
                                        generate_special_locations_full_data(world_lore, filler_location_names, special_location.location_type, special_location.location_name, special_location.location_short_lore)
                                            .then((special_location_data) => {
                                                if (special_location_data) {
                                                    send_message("add_to_world_logs", `Generated full data for special location ${special_location_data.type}. Name: ${special_location_data.name}, Biome: ${special_location_data.biome}, Resources: ${JSON.stringify(special_location_data.resources)}, Where-to-place: ${special_location_data.where_to_place}, Lore: "${special_location_data.lore}"`)

                                                    /*
                                                        the placement of the special location should default be a random filler location
                                                        matching the special locations "where_to_place"
                                                    */
                                                    
                                                    console.log(voronoi_locations.length == 0 ? "Correctly placing special location after filler locations" : "filler locations not finished placing, placing special location too early")
                                                    
                                                    let matching_filler_locations = Object.values(zone_table).filter((zone_data) => zone_data.type == special_location_data.where_to_place && zone_data.is_special == false)
                                                    if (matching_filler_locations.length == 0) {
                                                        console.log("no matching filler locations found")
                                                        console.log(special_location_data.where_to_place)
                                                        console.log(Object.values(zone_table).map((zone_data) => zone_data.type))
                                                        matching_filler_locations = Object.values(zone_table)
                                                    }
                                                    
                                                    const random_matching_filler_location = matching_filler_locations[Math.floor(Math.random()*matching_filler_locations.length)]
                                                    if (random_matching_filler_location) {
                                                        special_location_data.boundry_points = JSON.parse(JSON.stringify(random_matching_filler_location.boundry_points)) as [number, number][]
                                                        
                                                        delete zone_table[random_matching_filler_location.id]

                                                        const special_location_unique_zone_key = `${special_location_data.is_special ? "special" : "generic"}.${special_location_data.type.toLocaleLowerCase().replaceAll(" ", "_")}.${generate_random_string(6)}`

                                                        special_location_data.elevation = Math.round((Math.random()*(special_location_data.elevation_max-special_location_data.elevation_min)+special_location_data.elevation_min)*1000)/1000;
                                                        special_location_data.moisture = Math.round((Math.random()*(special_location_data.moisture_max-special_location_data.moisture_min)+special_location_data.moisture_min)*1000)/1000;
                                                        special_location_data.temperature = Math.round((Math.random()*(special_location_data.temperature_max-special_location_data.temperature_min)+special_location_data.temperature_min)*1000)/1000;
                                                        special_location_data.id = special_location_unique_zone_key

                                                        zone_table[special_location_unique_zone_key] = special_location_data
                                                        draw_location(ctx, special_location_data)
                                                    }
                                                }
                                            }).catch((error) => console.error(error))
                                    }
                                }
                            }).catch((error) => console.error(error))

                        // generate the full data for each filler location:
                        for (const filler_location of filler_locations) {
                            generate_filler_locations_full_data(world_lore, filler_location.location_type)
                                .then((filler_location_data) => {
                                    if (filler_location_data) {
                                        send_message("add_to_world_logs", `Generated full data for filler location ${filler_location_data.type}. Biome: ${filler_location_data.biome}, Resources: ${JSON.stringify(filler_location_data.resources)}, Placement-entropy: ${filler_location_data.placement_entropy},  Lore: "${filler_location_data.lore}"`)

                                        filler_location_data.probability = filler_location.location_probability;
                                
                                        for (let i = 0; i < Math.ceil(Number(voronoi_locations_base_count * filler_location_data.probability)); i++) {
                                            if (voronoi_locations.length > 0) {
                                                const new_filler_location_data = JSON.parse(JSON.stringify(filler_location_data)) as LocationDataType;
                                                
                                                let chosen_voronoi_location: [number, number][] | null = null;
                                                const is_random_placing = (Math.random() * 10) < (world_settings.forced_world_location_entropy??new_filler_location_data.placement_entropy);
                                    
                                                const existing_filler_locations_of_this_type = Object.values(zone_table).filter(
                                                (zone_data) => zone_data.type === new_filler_location_data.type
                                                );
                                    
                                                if (existing_filler_locations_of_this_type.length === 0 || is_random_placing) {
                                                chosen_voronoi_location = voronoi_locations[Math.floor(Math.random() * voronoi_locations.length)] ?? [];
                                                } else {
                                                const available_neighbour_locations: [number, number][][] = [];
                                    
                                                for (const existing_filler_location_of_this_type of existing_filler_locations_of_this_type) {
                                                    for (const available_voronoi_location of voronoi_locations) {
                                                    const matching_border_points = available_voronoi_location.filter((boundary_point) => 
                                                        existing_filler_location_of_this_type.boundry_points.some(
                                                        (p) => p[0] === boundary_point[0] && p[1] === boundary_point[1]
                                                        )
                                                    );
                                    
                                                    if (matching_border_points.length > 0) {
                                                        available_neighbour_locations.push(available_voronoi_location);
                                                    }
                                                    }
                                                }
                                    
                                                if (available_neighbour_locations.length > 0) {
                                                    chosen_voronoi_location = available_neighbour_locations[Math.floor(Math.random() * available_neighbour_locations.length)] ?? [];
                                                } else {
                                                    // Fallback to random if no neighbors are found
                                                    chosen_voronoi_location = voronoi_locations[Math.floor(Math.random() * voronoi_locations.length)] ?? [];
                                                }
                                                }
                                    
                                                const filler_location_unique_zone_key = `${new_filler_location_data.is_special ? "special" : "generic"}.${new_filler_location_data.type.toLowerCase().replaceAll(" ", "_")}.${generate_random_string(6)}`;
                                    
                                                new_filler_location_data.elevation = Math.round((Math.random() * (new_filler_location_data.elevation_max - new_filler_location_data.elevation_min) + new_filler_location_data.elevation_min) * 1000) / 1000;
                                                new_filler_location_data.moisture = Math.round((Math.random() * (new_filler_location_data.moisture_max - new_filler_location_data.moisture_min) + new_filler_location_data.moisture_min) * 1000) / 1000;
                                                new_filler_location_data.temperature = Math.round((Math.random() * (new_filler_location_data.temperature_max - new_filler_location_data.temperature_min) + new_filler_location_data.temperature_min) * 1000) / 1000;
                                                new_filler_location_data.id = filler_location_unique_zone_key;
                                                new_filler_location_data.boundry_points = chosen_voronoi_location;
                                    
                                                zone_table[filler_location_unique_zone_key] = new_filler_location_data;
                                    
                                                draw_location(ctx, new_filler_location_data);
                                    
                                                voronoi_locations = voronoi_locations.filter((voronoi_location) => voronoi_location !== chosen_voronoi_location);
                                            }
                                        }
                                    }
                                }).catch((error) => console.error(error))
                        }
                    }
                }).catch((error) => console.error(error))
        }).catch((error) => console.error(error))
}