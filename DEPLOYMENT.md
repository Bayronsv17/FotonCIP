# 🚀 Guía de Despliegue - Frontend en Vercel

## 📋 Pre-requisitos

1. Cuenta en [Vercel.com](https://vercel.com)
2. Cuenta en GitHub
3. Backend desplegado en Render (URL del backend lista)

## 🔧 Paso 1: Subir el Código a GitHub

```bash
# Navegar al directorio del frontend
cd c:\Users\52331\Desktop\RESIDENCIA\FotonCIP\frontend

# Si aún no has inicializado git en el proyecto principal
cd c:\Users\52331\Desktop\RESIDENCIA\FotonCIP
git init
git add .
git commit -m "Initial commit - Frontend ready for production"

# Crear repositorio en GitHub y conectar
git remote add origin https://github.com/TU_USUARIO/foton-frontend.git
git branch -M main
git push -u origin main
```

## 🔧 Paso 2: Configurar Vercel

### Opción A: Desde el Dashboard de Vercel

1. **Ir a [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Click en "Add New..." → Project**
3. **Importar repositorio de GitHub**:
   - Autorizar Vercel en GitHub si es necesario
   - Seleccionar el repositorio `foton-frontend`

4. **Configurar el proyecto**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` (si el repo incluye backend y frontend)
   - **Build Command**: `npm run build` (auto-detectado)
   - **Output Directory**: `dist` (auto-detectado)
   - **Install Command**: `npm install` (auto-detectado)

5. **Variables de Entorno**:
   Click en "Environment Variables" y agregar:
   
   ```
   VITE_API_URL=https://foton-backend.onrender.com/api
   ```
   
   ⚠️ **IMPORTANTE**: Reemplaza `foton-backend.onrender.com` con la URL real de tu backend en Render

6. **Deploy**: Click en "Deploy"

### Opción B: Desde la CLI de Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Navegar al directorio del frontend
cd c:\Users\52331\Desktop\RESIDENCIA\FotonCIP\frontend

# Login en Vercel
vercel login

# Desplegar
vercel

# Para producción
vercel --prod
```

## 🔧 Paso 3: Configurar Variables de Entorno en Vercel

1. En el Dashboard de Vercel, ir a tu proyecto
2. Settings → Environment Variables
3. Agregar:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://tu-backend.onrender.com/api`
   - **Environment**: Production, Preview, Development (seleccionar todos)
4. Click "Save"

## 🔧 Paso 4: Actualizar CORS en el Backend

Después de desplegar el frontend, obtendrás una URL como:
```
https://foton-cip.vercel.app
```

**Actualizar el backend**:
1. Ir a Render Dashboard → tu servicio backend
2. Environment → Editar `CORS_ORIGIN`
3. Cambiar a: `https://foton-cip.vercel.app`
4. Guardar cambios (esto reiniciará el backend)

## 🔧 Paso 5: Verificar el Despliegue

1. **URL del Frontend**: `https://tu-proyecto.vercel.app`
2. **Probar funcionalidades**:
   - Login
   - Dashboard
   - Crear cita
   - Chatbot
   - Todas las funciones principales

## ⚙️ Configuración de Dominios Personalizados (Opcional)

1. En Vercel Dashboard → Settings → Domains
2. Agregar tu dominio personalizado
3. Configurar DNS según las instrucciones de Vercel
4. Actualizar `CORS_ORIGIN` en el backend con el nuevo dominio

## 🔄 Actualizaciones Automáticas

Vercel está configurado para:
- ✅ **Auto-deploy** en cada `git push` a `main`
- ✅ **Preview deployments** para cada Pull Request
- ✅ **Instant rollbacks** si algo falla

## 📊 Monitoreo y Analytics

Vercel ofrece:
- **Analytics**: Métricas de rendimiento
- **Logs**: Logs de build y runtime
- **Speed Insights**: Análisis de velocidad
- **Web Vitals**: Core Web Vitals

## 🐛 Troubleshooting

### Error: "VITE_API_URL is not defined"
- Verificar que la variable esté configurada en Vercel
- Las variables deben empezar con `VITE_` para ser accesibles en Vite
- Hacer redeploy después de agregar variables

### Error: "Network Error" o CORS
- Verificar que `CORS_ORIGIN` en el backend incluya la URL de Vercel
- Verificar que `VITE_API_URL` apunte al backend correcto
- Revisar logs del backend en Render

### Error 404 en rutas
- Vercel maneja SPAs automáticamente con Vite
- Si persiste, verificar `vercel.json` o configuración de rewrites

### Build falla
- Revisar logs de build en Vercel Dashboard
- Verificar que todas las dependencias estén en `package.json`
- Probar build localmente: `npm run build`

## 📝 Checklist de Despliegue

- [ ] Código subido a GitHub
- [ ] Proyecto creado en Vercel
- [ ] Variable `VITE_API_URL` configurada
- [ ] Build completado exitosamente
- [ ] Frontend accesible en la URL de Vercel
- [ ] `CORS_ORIGIN` actualizado en el backend
- [ ] Login funciona correctamente
- [ ] API se conecta correctamente
- [ ] Todas las funcionalidades probadas

## 🔗 URLs Importantes

- **Frontend URL**: `https://tu-proyecto.vercel.app`
- **Backend URL**: `https://tu-backend.onrender.com`
- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Repo**: https://github.com/TU_USUARIO/foton-frontend

## 💡 Mejores Prácticas

1. **Usar variables de entorno** para todas las configuraciones
2. **No hacer commit de archivos `.env`** (ya está en `.gitignore`)
3. **Probar en preview** antes de hacer merge a main
4. **Monitorear analytics** para detectar problemas
5. **Configurar alertas** en Vercel para errores de build

## 🎯 Siguientes Pasos

1. Configurar dominio personalizado
2. Habilitar Vercel Analytics
3. Configurar Web Vitals monitoring
4. Implementar CI/CD con GitHub Actions (opcional)
5. Configurar staging environment (opcional)
