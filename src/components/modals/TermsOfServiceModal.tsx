import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/buttons/Button';
import { Icon } from '@iconify/react';
import { useThemeStore } from '../../store/useThemeStore';
import { openExternalUrl } from '../../services/tauri-service';
import { toast } from 'react-hot-toast';

interface TermsOfServiceModalProps {
  isOpen: boolean;
}

export function TermsOfServiceModal({ isOpen }: TermsOfServiceModalProps) {
  const { acceptTermsOfService } = useThemeStore();

  const handleAccept = () => {
    acceptTermsOfService();
    toast.success("¡Términos aceptados!");
  };

  const handleOpenTerms = async () => {
    try {
      await openExternalUrl('https://pixelplay.gg/terms');
      toast.success("Términos abiertos en tu navegador");
    } catch (error) {
      console.error("Failed to open Terms URL:", error);
      toast.error("No se pudieron abrir los términos. Visita https://pixelplay.gg/terms manualmente.");
    }
  };

  if (!isOpen) {
    return null;
  }

  const modalFooter = (
    <div className="flex flex-wrap justify-end gap-3">
      <Button 
        onClick={handleAccept} 
        variant="default" 
        icon={<Icon icon="solar:check-circle-bold" className="w-5 h-5" />}
      >
        Accept & Continue
      </Button>
    </div>
  );

  return (
    <Modal
  title="Términos de Uso"
  titleIcon={<Icon icon="solar:document-bold" className="w-7 h-7 text-accent" />}
      onClose={() => {}} // Prevent closing without accepting
      width="lg"
      footer={modalFooter}
      closeOnClickOutside={false}
    >
      <div className="p-6 space-y-6 text-white">
        <div className="text-center space-y-4">
          <h3 className="text-3xl font-minecraft text-accent lowercase">
            ¡Bienvenido a Pixel Play Client!
          </h3>
          <p className="text-lg font-minecraft-ten text-gray-300">
            Antes de usar el lanzador, por favor lee y acepta estos Términos de Uso.
          </p>
        </div>

          <div className="space-y-4 text-base font-minecraft-ten text-gray-200 max-h-60 overflow-y-auto custom-scrollbar p-4 bg-black/30 rounded border border-gray-600">
          <div className="space-y-3">
            <h4 className="text-lg font-minecraft text-white">Puntos clave:</h4>
            <ul className="space-y-2 list-disc list-inside text-sm">
              <li>El lanzador se ofrece "tal cual" y sin garantías explícitas.</li>
              <li>Eres responsable del uso de mods y contenido de terceros.</li>
              <li>Podemos actualizar estos términos cuando sea necesario.</li>
              <li>Al usar este lanzador aceptas la EULA de Minecraft.</li>
            </ul>
            
            <div className="pt-3 border-t border-gray-600">
              <p className="text-sm text-gray-400">
                Al continuar, confirmas que has leído y aceptas estos términos y la política de privacidad.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-400">
          <p>
            Puedes retirar tu consentimiento cuando quieras. Debes aceptar estos términos para usar Pixel Play Client.
          </p>
        </div>
      </div>
    </Modal>
  );
} 