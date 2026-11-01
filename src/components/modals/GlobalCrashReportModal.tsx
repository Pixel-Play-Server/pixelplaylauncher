import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useCrashModalStore } from '../../store/crash-modal-store';
import { Button } from '../ui/buttons/Button';
import { Icon } from '@iconify/react';
import { toast } from 'react-hot-toast';
import { getProfile, getProfileLatestLogContent } from '../../services/profile-service';
import { uploadClientLog } from '../../services/log-service';

export function GlobalCrashReportModal() {
  const { isCrashModalOpen, crashData, closeCrashModal } = useCrashModalStore();
  const [profileName, setProfileName] = useState<string>('');
  const [uploaded, setUploaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logPreview, setLogPreview] = useState<string>('');

  useEffect(() => {
    if (!crashData?.profile_id) {
      setProfileName('');
      setUploaded(false);
      setIsProcessing(false);
      setLogPreview('');
      return;
    }
    setUploaded(false);
    setIsProcessing(false);
    setProfileName(crashData.process_metadata?.profile_name || crashData.profile_id);
    const preview = [crashData.crash_report_content, crashData.latest_log_content]
      .filter((part) => part && part.trim() !== '')
      .join('\n\n');
    setLogPreview(preview);
    if (!crashData.process_metadata?.profile_name) {
      getProfile(crashData.profile_id)
        .then((details) => {
          if (details?.name) setProfileName(details.name);
        })
        .catch(() => {});
    }
    if (!preview) {
      getProfileLatestLogContent(crashData.profile_id)
        .then((content) => {
          if (content) setLogPreview(content);
        })
        .catch(() => {});
    }
  }, [crashData]);

  if (!isCrashModalOpen || !crashData) {
    return null;
  }

  const handleUpload = async () => {
    setIsProcessing(true);
    const toastId = toast.loading('Subiendo logs al panel…');
    try {
      let latest = crashData.latest_log_content || '';
      const crash = crashData.crash_report_content || '';
      if (!latest.trim() && crashData.profile_id) {
        latest = await getProfileLatestLogContent(crashData.profile_id);
      }
      if (!latest.trim() && !crash.trim()) {
        throw new Error('No hay logs para subir. El juego no dejó latest.log.');
      }
      const result = await uploadClientLog({
        profileId: crashData.profile_id,
        exitCode: crashData.exit_code,
        logContent: latest,
        crashReport: crash,
        mcName: crashData.process_metadata?.account_name,
        profileName: crashData.process_metadata?.profile_name || profileName,
        pack: crashData.process_metadata?.pixelplay_pack,
        minecraftVersion: crashData.process_metadata?.minecraft_version,
        loader: crashData.process_metadata?.modloader,
      });
      if (!result?.ok) {
        throw new Error('La API no aceptó el log.');
      }
      setUploaded(true);
      toast.success('Logs enviados. Ya los puedes ver en el panel.', { id: toastId });
    } catch (error: any) {
      toast.error(error?.message || 'No se pudieron subir los logs.', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const previewTail = logPreview
    ? logPreview.split(/\r?\n/).slice(-40).join('\n')
    : '';

  return (
    <Modal
      title="Minecraft se cerró con error"
      titleIcon={<Icon icon="solar:danger-bold" className="w-7 h-7 text-red-400" />}
      titleSubtitle={
        <p className="text-xs font-minecraft-ten text-gray-400">
          {crashData.process_metadata?.account_name
            ? `${crashData.process_metadata.account_name} · `
            : ''}
          {profileName || 'Perfil'}
        </p>
      }
      onClose={() => !isProcessing && closeCrashModal()}
      width="lg"
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            onClick={handleUpload}
            variant="secondary"
            icon={<Icon icon="solar:upload-linear" className="w-5 h-5" />}
            disabled={isProcessing}
          >
            {uploaded ? 'Volver a subir logs' : 'Subir logs'}
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-4 text-white">
        <p className="text-gray-300 text-base">
          El juego no salió con código 0. Si fue un crash, subí los logs para verlos
          en el panel con el nombre de Minecraft y la IP.
        </p>
        <p className="text-2xl font-minecraft text-red-400 text-center">
          código de salida: {crashData.exit_code ?? 'N/A'}
        </p>
        {previewTail && (
          <pre className="max-h-56 overflow-auto rounded-md bg-black/40 p-3 text-left text-xs text-gray-300 whitespace-pre-wrap break-words">
            {previewTail}
          </pre>
        )}
      </div>
    </Modal>
  );
}
