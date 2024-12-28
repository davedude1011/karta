"use client"

import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { type WorldSettingsType } from "~/server/gemini/generate_location";

export default function Page() {
  const router = useRouter();

  const example_maps = [
    {settings: {world_description: "An expanse of ocean, a massive ocean world, small islands dot the area spread apart", forced_world_location_entropy: 0}, url: "example_maps/water_map.png"},
    {settings: {world_description: "A candy lovers world, a world of cotten candy clouds and dreamy chocolate rivers, a sweet tooths heaven", forced_world_location_entropy: null}, url: "example_maps/candy_map.png"},
    {settings: {world_description: "The world of Hell, deep fiery pits and vast dry expanses", forced_world_location_entropy: 2}, url: "example_maps/hell_map.png"},
    {settings: {world_description: "The kingdom of heaven, a celestial realm of gods, cascades of ambrosia, monumental detailed buildings of the gods", forced_world_location_entropy: null}, url: "example_maps/heaven_map.png"},
    {settings: {world_description: "A medieval world, a central kingdom of humans, lush open meadows, and beautiful flower fields, but also goblin areas, dark mucky areas, hidden in the shadows of the world", forced_world_location_entropy: 1}, url: "example_maps/medieval_map.png"},
    {settings: {world_description: "Open space, vast expanses of nothingness, a couple stars or planets dot the areas", forced_world_location_entropy: 0}, url: "example_maps/space_map.png"}
  ] as {settings: WorldSettingsType, url: string}[]
  const [active_example_map, set_active_example_map] = useState<{settings: WorldSettingsType, url: string}>(example_maps[0]!)

  const [world_description, set_world_description] = useState("")
  const [forced_world_location_entropy, set_forced_world_location_entropy] = useState<null|number>(null)

  const world_settings: WorldSettingsType = {
    world_description: world_description,
    forced_world_location_entropy: forced_world_location_entropy,
    world_lore: null
  }
  
  return (
    <div className="h-screen w-screen flex flex-row gap-6 justify-center items-center p-36">
      <Card className="p-12 flex flex-col justify-between gap-6 flex-grow h-full">
        <div className="w-full text-3xl">
          World Map Generator
        </div>
        <div className="flex flex-col flex-grow gap-2">
          <Label htmlFor="map-description">World Description</Label>
          <Textarea value={world_description} onChange={(e) => set_world_description(e.target.value)} className="!flex-grow resize-none" placeholder="Describe your world..." />
        </div>
        <div className="flex flex-row gap-2">
          <Button className="w-full" onClick={() => {
            localStorage.setItem("stringified_world_settings", JSON.stringify(world_settings))
            router.push('/map-generate')
          }}>Generate World</Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant={"outline"}>Advanced</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]" onOpenAutoFocus={(e) => {e.preventDefault()}}>
              <DialogHeader>
                <DialogTitle>Advanced Generation Settings</DialogTitle>
              </DialogHeader>
              
              <div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-row justify-between items-end">
                    <Label htmlFor="placement-entropy">Placement entropy</Label>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size={"icon"} variant={"ghost"}><Info /></Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Location randomness. 0 = connected, 10 = fully random.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input id="placement-entropy" placeholder="0-10" value={forced_world_location_entropy??""} onChange={(e) => {set_forced_world_location_entropy(e.target.value.length > 0 ? Number(e.target.value)??null : null)}} />
                </div>
              </div>

              <DialogFooter>
                <DialogClose>
                  <Button>Save changes</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Card>
      <Card className="flex flex-col justify-between w-[332px] h-full p-4">
        <Label>Example Maps</Label>

        <div className="relative aspect-square w-[300px]" style={{height: `${300+(20*(example_maps.length-1))}px`}}>
          {
            [...example_maps.filter((map_data) => map_data.url != active_example_map.url), active_example_map].map((map_data, index) => (
              <div 
                key={map_data.settings.world_description}
                className={`absolute top-0 w-full h-[300px] ${map_data != active_example_map && "hover:-translate-y-2 hover:-translate-x-12 cursor-pointer hover:-rotate-3"} transition-transform`}
                style={{translate: `0 ${(index)*20}px`}}
                onClick={() => {
                  set_active_example_map(map_data)
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="rounded-md h-[300px]" src={map_data.url} alt={map_data.settings.world_description} />
              </div>
            ))
          }
        </div>
        <Button variant={"outline"} onClick={() => {
          set_world_description(active_example_map.settings.world_description)
          set_forced_world_location_entropy(active_example_map.settings.forced_world_location_entropy)
        }}>Copy settings</Button>
      </Card>
    </div>
  );
}