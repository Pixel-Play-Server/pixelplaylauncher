Pixel Play Launcher — guía rápida para actualizar desde Cloudflare R2 (S3-compatible)

Resumen corto
- Usaremos Cloudflare R2 para alojar los artifacts (manifests + binarios).
- Subiremos los artifacts al bucket bajo una estructura tipo: `pixelplay/releases-v2/<target>/<version>/`.
- Expondremos el bucket mediante un Cloudflare Worker (o un dominio + CDN) para servir por HTTPS.
- El launcher buscará el manifest exactamente en `(endpoint)/pixelplay/releases-v2/(target)/{{current_version}}/version.json`.
   - Los valores de `(target)` esperados son:
     - `windows-x86_64`
     - `linux-x86_64`
     - `mac-arm`
     - `mac-intel`

Pasos en términos sencillos
1) Crear bucket en Cloudflare R2 y obtener:
   - Access Key ID
   - Secret Access Key
   - Endpoint (ej: https://<account_id>.r2.cloudflarestorage.com)

2) Preparar el build pipeline (GitHub Actions):
   - Usa el workflow `.github/workflows/upload-to-r2.yml` incluido.
   - Añade los secrets en GitHub: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET`, `UPDATER_BASE_URL`.
   - El workflow descargará los artifacts y ejecutará `aws --endpoint-url <R2_ENDPOINT> s3 sync` al bucket.

3) Deploy del Worker (opcional para exponer HTTPS fácilmente):
   - Instala `wrangler` y configura `wrangler.toml` (archivo de ejemplo en `r2-worker/`).
   - Define binding R2 con el nombre `UPDATER_BUCKET` y despliega el Worker.
   - Resultado: el Worker sirve los objetos de R2 en la ruta pública del Worker.

4) Configura el launcher para apuntar al bucket/Worker:
   - En CI (recomendado) define `PIXELPLAY_UPDATER_BASE_URL_COMPILED='https://mi-endpoint.r2.dev/pixelplay/releases-v2'` antes del build para incrustarlo en el binario.
   - Para pruebas locales define `PIXELPLAY_UPDATER_BASE_URL='https://mi-endpoint.r2.dev/pixelplay/releases-v2'` en el entorno y ejecuta `yarn dev`.

5) Estructura esperada en el bucket (ejemplo):
   - `pixelplay/releases-v2/win64/4.0.0/version.json`
   - `pixelplay/releases-v2/win64/4.0.0/pixelplay-Windows-setup.exe`
   - `pixelplay/releases-v2/win64/4.0.0/pixelplay-Windows-setup.exe.sig`

Comandos útiles locales
 - Subir artifacts con AWS CLI (usar endpoint R2):
```bash
aws --endpoint-url "https://<account_id>.r2.cloudflarestorage.com" s3 sync ./artifacts s3://my-bucket/pixelplay/releases-v2/ --exact-timestamps
```

 - Subir con el script incluido:
```bash
chmod +x scripts/upload_to_r2.sh
./scripts/upload_to_r2.sh ./artifacts my-bucket https://<account_id>.r2.cloudflarestorage.com pixelplay/releases-v2 stable
```

Notas de seguridad
- Mantén las claves R2 en GitHub Secrets.
- Usa HTTPS y, si es posible, pon delante una CDN o Worker para controlar CORS y caching.

Problemas comunes
- Si el updater no ve la nueva versión, revisa que la URL construida por el launcher coincida con la ruta en el bucket, incluyendo el sufijo `version.json`.
- Verifica que los manifests y .sig que subes correspondan a los generados por Tauri (si usas firma).
