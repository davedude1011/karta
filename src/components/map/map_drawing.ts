import { type LocationDataType } from "~/server/gemini/generate_location";
//import { get_centroid } from "./map_logic";
import ReactDOMServer from 'react-dom/server';

export function draw_circle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string): void {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}

export function draw_line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string): void {
    ctx.beginPath();
    ctx.moveTo(x1, y1);  // Start point
    ctx.lineTo(x2, y2);   // End point
    ctx.strokeStyle = color;
    ctx.stroke();
}

export function draw_polygon(ctx: CanvasRenderingContext2D, point_array: [number, number][], color = "black", gap = 0) {
    if (!point_array || point_array.length === 0) return 0;

    function offset_point(p1: [number, number], p2: [number, number], gap: number): [number, number] {
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const length = Math.sqrt(dx * dx + dy * dy);
        const offsetX = (dx / length) * gap;
        const offsetY = (dy / length) * gap;

        return [p1[0] + offsetX, p1[1] + offsetY];
    }

    for (const point_coords of point_array) {
        draw_circle(ctx, point_coords[0], point_coords[1], 2, color);
    }

    if (point_array.length === 2) {
        const current_point_coords = point_array[0]
        const next_point_coords = point_array[1]

        if (current_point_coords && next_point_coords) {
        const [current_x, current_y] = offset_point(current_point_coords, next_point_coords, gap);
        const [next_x, next_y] = offset_point(next_point_coords, current_point_coords, gap);

        draw_line(ctx, current_x, current_y, next_x, next_y, color);
        }
        
        return 1;
    }

    if (point_array.length > 2) {
        let counter = 0;
        while (counter < point_array.length - 1) {
        const current_point_coords = point_array[counter]
        const next_point_coords = point_array[counter+1]

        if (current_point_coords && next_point_coords) {
            const [current_x, current_y] = offset_point(current_point_coords, next_point_coords, gap);
            const [next_x, next_y] = offset_point(next_point_coords, current_point_coords, gap);

            draw_line(ctx, current_x, current_y, next_x, next_y, color);
        }
        counter++;
        }

        const current_point_coords = point_array[counter]
        const start_point_coords = point_array[0]

        if (current_point_coords && start_point_coords) {
        const [startX, startY] = offset_point(current_point_coords, start_point_coords, gap);
        const [endX, endY] = offset_point(start_point_coords, current_point_coords, gap);

        draw_line(ctx, startX, startY, endX, endY, color);
        }

        return 1;
    }

    return 1;
}

export function fill_polygon(ctx: CanvasRenderingContext2D, point_array: [number, number][], color = "black", alpha = 1) {
    function hex_to_rgb(hex: string): string {
        hex = hex.replace("#", "");
        const bigint = parseInt(hex, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `${r}, ${g}, ${b}`;
    }

    if (!point_array || point_array.length < 3) return;

    const start_coord = point_array[0]
    if (start_coord) {
        const [start_x, start_y] = start_coord

        ctx.beginPath();
        ctx.moveTo(start_x, start_y);

        for (let i = 1; i < point_array.length; i++) {
        const next_coord = point_array[i]
        if (next_coord) {
            const [next_x, next_y] = next_coord

            ctx.lineTo(next_x, next_y)
        }
        }
        
        ctx.closePath();
        ctx.fillStyle = color.startsWith("#") 
        ? `rgba(${hex_to_rgb(color)}, ${alpha})` 
        : color;  // Use color directly if not hex
        ctx.globalAlpha = alpha;  // Handle transparency for named colors
        ctx.fill();
        ctx.globalAlpha = 1;  // Reset alpha
    }
}

export function draw_element(ctx: CanvasRenderingContext2D, element: React.ReactNode, x: number, y: number, width: number, height: number, color="black" ) {
    const htmlString = ReactDOMServer.renderToStaticMarkup(
        // @ts-expect-error uhh
        React.cloneElement(element, {
        style: {
            color: color, // Example to inline color
        }
        })
    );

    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = htmlString;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCanvas.width = width;
    tempCanvas.height = height;

    const img = new Image();
    const svgBlob = new Blob([htmlString], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);

    img.onload = () => {
        ctx.drawImage(img, x, y, width, height);
    };

    img.src = svgUrl;
}

export function draw_location(ctx: CanvasRenderingContext2D, location_data: LocationDataType) {
    if (location_data.is_special) {
        draw_polygon(ctx, location_data.boundry_points, location_data.display_color, 5)

        //const point_array_centroid_coords = get_centroid(location_data.boundry_points)
        //draw_element(ctx, location_data.icon??<MdOutlinePinDrop />, point_array_centroid_coords[0]-10, point_array_centroid_coords[1]-10, 20, 20, "black")
    }

    fill_polygon(ctx, location_data.boundry_points, location_data.display_color, 0.8)
}