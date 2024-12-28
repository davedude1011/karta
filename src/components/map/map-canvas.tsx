"use client"

import { useEffect, useRef } from "react";
import { fill_polygon } from "./map_drawing";
import { type WorldSettingsType, type LocationDataType } from "~/server/gemini/generate_location";
import { generate_world_zone_table, is_point_in_poligon } from "./map_logic";
import { recieve_message, send_message } from "../logic/event-messages";

export default function MapCanvas({world_settings}: {world_settings: WorldSettingsType}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const hasRun = useRef(false);

    useEffect(() => {
      if (hasRun.current) return;  // Skip if it's already run once

      console.log("GENERATING");
      const canvas = canvasRef.current;
      if (!canvas) return;

      recieve_message("download_map", (message) => {
        if (message == true) {
          const link = document.createElement('a');
          link.download = 'filename.png';
          link.href = canvas.toDataURL()
          link.click();
        }
      })

      const ctx = canvas.getContext('2d');
      if (ctx) {
        fill_polygon(ctx, [[0, 0], [1000, 0], [1000, 1000], [0, 1000]], "white", 1)

        const zone_table = {} as Record<string, LocationDataType>
        generate_world_zone_table(zone_table, ctx, world_settings).then().catch((error) => console.error(error))

        canvas.addEventListener("click", (event) => {
          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          const canvasX = (x / rect.width) * 1000;
          const canvasY = (y / rect.height) * 1000;

          for (const zone_data of Object.values(zone_table)) {
            if (is_point_in_poligon([canvasX, canvasY], zone_data.boundry_points)) {
              send_message("set_selected_location_data", zone_data)
              break;
            }
          }
        });
      }

      hasRun.current = true;  // Mark it as run
    }, [world_settings]);

    return <canvas ref={canvasRef} width={1000} height={1000} className="shadow-lg border scale-75" style={{margin: "-125px"}} />
}