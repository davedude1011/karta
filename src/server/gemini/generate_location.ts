"use server"

import { GoogleGenerativeAI } from "@google/generative-ai";

function parse_ai_json(input: string): unknown {
    try {
      // 1. Remove any code block markers like ```json, json`, or ``` (and any leading/trailing spaces)
      let fixed = input.replace(/```?json`?/g, '').trim();
      
      // 2. Ensure any remaining trailing backticks or characters are removed
      fixed = fixed.replace(/`/g, '').trim();
  
      // 3. Replace single quotes around keys and values with double quotes
      fixed = fixed.replace(/([{,]\s*)'([^']+?)'\s*:/g, '$1"$2":'); // Keys
      fixed = fixed.replace(/:\s*'([^']+?)'/g, ': "$1"'); // Values
  
      // 4. Escape unescaped quotes inside string values (carefully)
      fixed = fixed.replace(/:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        return `: "${p1.replace(/(?<!\\)"/g, '\\"')}"`;
      });
  
      // 5. Remove trailing commas in objects and arrays
      fixed = fixed.replace(/,(?=\s*[}\]])/g, '');
  
      // 6. Remove comments (both inline and block) outside of string values
      fixed = fixed.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
  
      // 7. Replace undefined with null, avoiding it in string values
      fixed = fixed.replace(/(?<=[:\s])\bundefined\b/g, 'null');
  
      // 8. Ensure JSON is correctly formatted by parsing it
      return JSON.parse(fixed);
    } catch (error) {
      console.error("Error fixing JSON:", error);
      return null;
    }
  }
  
  

export async function generate_world_lore(world_description: string): Promise<string> {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY??"");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `YOUR TASK IS TO TAKE IN A DESCRIPTION OF A FICTION WORLD AND GENERATE A LORE DESCRIPTION FOR IT, IT SHOULD TALK ABOUT THE SCENERAY, BREIF HISTORY, AND SHOULD ACT AS THE BASE LORE FOR THE MAP, HERE IS THE WORLD DESCRIPTION: [${world_description}]. ONLY OUTPUT THE THE LORE DESCRIPTION. NO FORMATTING OR SPECIAL CHARACTERS.`;

    const result = await model.generateContent(prompt);
    console.log(result.response.text())

    const world_lore = result.response.text()
    return world_lore
}

export async function generate_special_locations(world_lore: string): Promise<{location_type: string, location_name: string, location_short_lore: string}[] | null> {
    let attempts = 0
    while (attempts < 10) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY??"");
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
            const prompt = `YOUR TASK IS TO TAKE A DESCRIPTION/LORE OF A FICTIONAL WORLD AS INPUT AND OUTPUT LOCATION TYPES AND DATA THAT WOULD BE PRESENT ON THE WORLD. DONT MAKE GENERIC LOCATIONS LIKE DESSERTS OR OCEANS, INSTEAD MAKE DESSERT MONUMENTS OR OCEAN TEMPLES, GENERIC LOCATIONS ARE MADE SEPERATLY, YOU ARE ONLY TASKED WITH GENERATING SPECIAL AREAS. HERE IS YOUR INPUT: [${world_lore}]. EXAMPLE LOCATION DATA {"location_type": "city", "location_name": "Orario", "location_short_lore": "The birthplace of the Human civilisation, and home to many of the Gods who helped create them."}, YOU ARE SUGGESTED TO PRODUCE MULTIPLE OF THE SAME "location_type" WITH DIFFERING "location_name"'s AND "location_lore"'s AS ONLY ONE OF EACH IS NOT VERY FILLING FOR A MAP, YOUR OUTPUT SHOULD BE IN THE FORM {"location_type": string, "location_name": string, "location_short_lore": string}[]. MAKE SURE TO WRAP THE KEYS WITH "". NO FORMATTING OR SPEECH.`;
        
            const result = await model.generateContent(prompt);
        
            const location_types = parse_ai_json(result.response.text()) as {location_type: string, location_name: string, location_short_lore: string}[]
            console.log(location_types)
        
            return location_types
        }
        catch (e) {
            console.log(e)
            attempts ++
        }
    }
    return null
}

export async function generate_filler_locations(world_lore: string): Promise<{location_type: string, location_probability: number}[] | null> {
    let attempts = 0
    while (attempts < 10) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY??"");
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
            const prompt = `YOUR TASK IS TO TAKE IN AN INPUT OF A WORLD DESCRIPTION/LORE AND GENERATE GENERIC FILLER LOCATION TYPES, THE MAIN LOCATIONS SUCH AS CASTLES AND NAMES SPORT HAVE BEEN MADE, YOUR JOB IS GENERATE A LIST OF "GENERIC" LOCATIONS AND THEIR PROBABILITY, BY GENERIC I MEAN THESE LOCATIONS WILL FILL THE EXCESS OF THE ENTIRE MAP, SO THEY NEED TO BE GENERIC LIKE FOREST OR DESSERT ETC. HERE IS YOUR INPUT: [${world_lore}]. EXAMPLE LOCATION DATA: {"location_type": "dessert", "location_probability": 0.2}, THE COMBINED "location_probability"'s MUST ADD UP TO 1. THE OUTPUT MUST BE IN THE FORM {"location_type": string, "location_probability": number}[], THESE NEED TO BE VERY GENERIC LOCATIONS AS THEY WILL FILL THE WHOLE MAP. MAKE SURE TO WRAP THE KEYS WITH "". NO FORMATTING OR SPEECH.`;
        
            const result = await model.generateContent(prompt);
        
            const filler_locations = parse_ai_json(result.response.text()) as {location_type: string, location_probability: number}[]
            console.log(filler_locations)
        
            return filler_locations
        }
        catch (e) {
            console.log(e)
            attempts ++
        }
    }
    return null
}

export type LocationDataType = {
    id: string,
    is_special: boolean,
    boundry_points: [number, number][],
    where_to_place?: string,
    type: string,
    name?: string,
    placement_entropy: number,
    display_color: string,
    biome: string,
    elevation_min: number,
    elevation_max: number,
    elevation: number,
    temperature_min: number,
    temperature_max: number,
    temperature: number,
    moisture_min: number,
    moisture_max: number,
    moisture: number,
    resources: string[],
    population?: number,
    lore: string,
    danger_level: number,
    development?: number,
    world_wonder?: boolean,
    probability?: number
}
export type WorldSettingsType = {
    world_description: string,
    forced_world_location_entropy: null|number,
    world_lore: null|string
}

export async function generate_special_locations_full_data(world_lore: string, filler_location_names: string[], special_location_type: string, special_location_name: string, special_location_short_lore: string): Promise<LocationDataType | null> {
    let attempts = 0
    while (attempts < 10) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY??"");
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
            const prompt = `YOUR TASK IS TO TAKE IN THE TYPE, NAME AND SHORT LORE FOR A LOCATION AND GENERATE LOCATION DATA IN A GIVEN FORMAT FOR IT. CONTEXT OF THE WORLD THAT THIS LOCATION IS IN: [${world_lore}]. LOCATION TYPE: [${special_location_type}], LOCATION NAME: [${special_location_name}], LOCATION SHORT LORE: [${special_location_short_lore}]. THE OUTPUT SHOULD BE IN THE FORM: {"where_to_place": ${filler_location_names.map((filler_location_name) => `"${filler_location_name}"`).join("|")}, "type": string, "name": string, "display_color": string (color hex), "biome": string, "elevation_min": number (0 is ground level, <0 for low, >0 for high), "elevation_max": number (0 is ground level, <0 for low, >0 for high), "temperature_min": number, "temperature_max": number, "moisture_min": number, "moisture_max": number, "resources": string[], "population": number, "lore": string (generate a detailed lore, but not too long), "danger_level": number (0 is peaceful, 10 is instant death), "development": number (0 is complete nature, 10 is densly urban hightech civilisation), "world_wonder": boolean}. THE "where_to_place" PARAMETER ALLOWS YOU TO PICK AN APROPRIATE FITTING PLACE FOR THIS NEW LOCATION ONLY USE THE GIVEN OPTIONS. MAKE SURE TO WRAP THE KEYS WITH "". NO FORMATTING OR SPEECH.`;
        
            const result = await model.generateContent(prompt);
        
            const special_location_data = parse_ai_json(result.response.text()) as LocationDataType
            special_location_data.is_special = true
            console.log(special_location_data)
        
            return special_location_data
        }
        catch (e) {
            console.log(e)
            attempts ++
        }
    }
    return null
}

export async function generate_filler_locations_full_data(world_lore: string, filler_location_type: string): Promise<LocationDataType | null> {
    let attempts = 0
    while (attempts < 10) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY??"");
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
            const prompt = `YOUR TASK IS TO TAKE IN A GENERIC LOCATION TYPE AND GENERATE LOCATION DATA IN A GIVEN FORMAT FOR IT. CONTEXT OF THE WORLD THAT THIS LOCATION IS IN: [${world_lore}]. LOCATION TYPE: [${filler_location_type}]. THE OUTPUT SHOULD BE IN THE FORM: {"type": string, "placement_entropy": number (0 = locations are all connected, 10 = completely random distribution), "display_color": string (color hex), "biome": string, "elevation_min": number (0 is ground level, <0 for low, >0 for high), "elevation_max": number (0 is ground level, <0 for low, >0 for high), "temperature_min": number, "temperature_max": number, "moisture_min": number, "moisture_max": number, "resources": string[], "lore": string (generalised lore for all of this location type arround the map), "danger_level": number (0 is peaceful, 10 is instant death)}. MAKE SURE TO WRAP THE KEYS WITH "". NO FORMATTING OR SPEECH.`;
        
            const result = await model.generateContent(prompt);
        
            const filler_location_data = parse_ai_json(result.response.text()) as LocationDataType
            filler_location_data.is_special = false
            filler_location_data.probability = 0 // propper value gets set locally
            console.log(filler_location_data)
        
            return filler_location_data
        }
        catch (e) {
            console.log(e)
            attempts ++
        }
    }
    return null
}