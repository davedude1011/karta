"use client"

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { recieve_message, send_message } from "~/components/logic/event-messages";
import MapCanvas from "~/components/map/map-canvas";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { ThemeToggle } from "~/components/ui/theme-toggle";
import { type LocationDataType, type WorldSettingsType } from "~/server/gemini/generate_location";

export default function Page() {
    const router = useRouter()

    const [world_settings, set_world_settings] = useState<WorldSettingsType|null>(null)

    const [selected_tab, set_selected_tab] = useState<"world_logs"|"location_data">("world_logs")
    const [world_logs, set_world_logs] = useState<string[]>([])
    const [selected_location_data, set_selected_location_data] = useState<LocationDataType|null>(null)

    useEffect(() => {
        const stringified_world_settings = localStorage.getItem("stringified_world_settings")
        if (stringified_world_settings) {
            set_world_settings(JSON.parse(stringified_world_settings) as WorldSettingsType)
        }
    }, [])

    useEffect(() => {
        recieve_message("add_to_world_logs", (message: string) => {
            set_world_logs([...world_logs, message])
        })
    }, [world_logs])

    useEffect(() => {
        recieve_message("set_selected_location_data", (message: LocationDataType) => {
            set_selected_location_data(message)
        })
    }, [])

    if (world_settings) {
        return (
            <div className="flex flex-col w-screen h-screen">
                <div className="flex flex-row justify-between gap-4 p-12 pb-2">
                    <div className="flex flex-row gap-4">
                        <Button variant={"outline"} onClick={() => {
                            router.push("/")
                        }}>Generate new map</Button>
                        <ThemeToggle />
                    </div>
                    <div className="flex flex-row gap-4">
                        <Button variant={"outline"} onClick={() => {
                            send_message("download_map", true)
                        }}>Download Map</Button>
                    </div>
                </div>
                <div className="flex flex-row justify-between flex-grow p-12 pt-2 gap-4">
                    <div className="h-screen flex-grow flex flex-col gap-2 border border-dashed p-4 rounded-md overflow-auto">
                        <div className="flex flex-row gap-2">
                            <Button size={"sm"} variant={selected_tab == "world_logs" ? "default" : "outline"} onClick={() => set_selected_tab("world_logs")}>World Logs</Button>
                            <Button size={"sm"} variant={selected_tab == "location_data" ? "default" : "outline"} onClick={() => set_selected_tab("location_data")}>Location Data</Button>
                        </div>
                        {
                            selected_tab == "world_logs" ? (
                                <div className="flex flex-col gap-4 h-fit">
                                    {
                                        world_logs.map((world_log, index) => (
                                            <div key={index}>
                                                {world_log}
                                            </div>
                                        ))
                                    }
                                </div>
                            ) :
                            selected_tab == "location_data" ? (
                                <div className="flex flex-col gap-2 h-fit">
                                    {
                                        selected_location_data ? (
                                            <Accordion type="multiple" className="w-full">
                                                {
                                                    Object.keys(selected_location_data).sort().map((selected_location_value_key, index) => (
                                                        <AccordionItem value={`item-${index+1}`} key={index}>
                                                            <AccordionTrigger>{selected_location_value_key}</AccordionTrigger>
                                                            <AccordionContent>
                                                                {/* @ts-expect-error i would ask my rubber ducky but hes out rn :I */}
                                                                {JSON.stringify(selected_location_data[selected_location_value_key])}
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    ))
                                                }
                                            </Accordion>
                                        ) : (
                                            <div>
                                                Click on a location on the map to view its data.
                                            </div>
                                        )
                                    }
                                </div>
                            ) : (<div>uh?..</div>)
                        }
                    </div>
                    <MapCanvas world_settings={world_settings} />
                </div>
            </div>
        )
    }
    return <div>No world settings found :-(</div>
}