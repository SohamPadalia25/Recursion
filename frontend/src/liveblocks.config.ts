import { createClient, type LiveMap, type LiveObject } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

type Presence = {
  selectedShape: string | null;
};

type Stroke = LiveObject<{
  points: number[];
  color: string;
  size: number;
}>;

type Storage = {
  shapes: LiveMap<string, Stroke>;
};

const client = createClient({
  publicApiKey:
    import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY ||
    "pk_dev_placeholder_replace_with_valid_key",
});

export const { RoomProvider, useHistory, useMutation, useStorage } =
  createRoomContext<Presence, Storage>(client);
