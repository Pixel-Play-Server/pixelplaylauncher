"use client";

import React from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/buttons/Button";
import { Icon } from "@iconify/react";
import { useSocialsModalStore } from "../../store/socials-modal-store";
import { openExternalUrl } from "../../services/tauri-service";

export function SocialsModal() {
  const { isModalOpen, closeModal } = useSocialsModalStore();

  if (!isModalOpen) return null;

  return (
    <Modal
      title="Redes de Pixel Play"
      titleIcon={<Icon icon="mdi:share-variant" className="w-7 h-7 text-accent" />}
      onClose={closeModal}
      width="md"
    >
      <div className="p-6 space-y-4 text-white">
        <p className="text-sm text-gray-300">
          Aquí encontrarás enlaces a las redes oficiales de Pixel Play. Hemos eliminado la vinculación de cuentas para simplificar la experiencia.
        </p>

        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={() => openExternalUrl("https://discord.pixelplay.gg").catch(() => {})}
            variant="flat"
            icon={<Icon icon="mdi:discord" className="w-5 h-5" />}
          >
            Discord
          </Button>

          <Button
            onClick={() => openExternalUrl("https://pixelplay.gg").catch(() => {})}
            variant="flat"
            icon={<Icon icon="mdi:web" className="w-5 h-5" />}
          >
            Sitio web
          </Button>

          <Button
            onClick={() => openExternalUrl("https://pixelplay.gg/download").catch(() => {})}
            variant="default"
            icon={<Icon icon="mdi:download" className="w-5 h-5" />}
          >
            Descargar Pixel Play
          </Button>
        </div>

        <div className="text-sm text-gray-400">
          <p>Si necesitas ayuda, visita nuestro Discord o la web oficial.</p>
        </div>
      </div>
    </Modal>
  );
}
