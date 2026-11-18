# Plan de accion - TP Integrador de Ingenieria de Software II

**Estado general:** Implementacion parcial; entrega aun no completa  
**Ultima actualizacion:** 17 de noviembre de 2026  
**Tecnologia elegida para el eje tecnico:** RabbitMQ (sistemas distribuidos / pub-sub)  
**Proveedor de IA elegido:** Vercel AI Gateway

### Avance de implementacion

- Temas a reforzar: implementada la consulta protegida por RLS, la priorizacion, los estados y el enlace a practica con tema y nivel precargados. Las pruebas unitarias cubren el orden y los umbrales; falta verificar el recorrido completo con dos temas y usuarios reales o temporales.
- Estado vigente: modelo gratuito de texto en Vercel y embeddings `gte-small` en Supabase. Una prueba temporal autenticada paso por RabbitMQ y el worker, produjo tres tarjetas y recupero un fragmento por similitud; se verifico el bloqueo a acceso anonimo y se eliminaron los datos de prueba. Todavia falta probar la interfaz de extremo a extremo, recuperacion ante fallas, Compose autocontenido y despliegue cloud. `WHITE_PAPER.md` es un borrador con limitaciones explicitas.
- CloudAMQP: conexion autenticada y envio/recepcion comprobados en una cola temporal. Sigue faltando alojar el worker y desplegar la web. Se actualizo Next.js a 16.4.6; auditoria de dependencias de produccion sin vulnerabilidades reportadas. La auditoria completa todavia reporta avisos de desarrollo.
- El worker incluye generacion automatica de tres tarjetas iniciales, con validacion y almacenamiento por documento. Migracion aplicada y generacion verificada en el circuito de trabajo con un usuario temporal.

- La funcion Edge `gte-small` devuelve vectores de 384 dimensiones; los materiales indexados con el metodo anterior se conservan pero deben cargarse de nuevo. La API genero 10 flashcards y 5 preguntas por separado con el modelo gratuito.
- Se agregaron pruebas de particionado, formato de tarjetas y distribucion adaptativa. Lint y build locales pasan; la prueba RAG completa con usuario y las pruebas de recuperacion de fallas siguen pendientes.
- Docker Desktop, web, worker y RabbitMQ locales se levantaron y la web respondio HTTP 200. Supabase sigue siendo externo; aun falta demostrar Compose autocontenido, despliegue cloud, mediciones y ensayo.

## Objetivo de entrega

Entregar una PoC funcional de la plataforma de estudio que permita a un alumno cargar material, procesarlo asincronicamente y generar contenido de estudio. El sistema usa RabbitMQ para comunicar la aplicacion con un worker, Vercel AI Gateway para texto y Supabase para embeddings y vectores; muestra temas a reforzar a partir de las respuestas.

Al finalizar este plan se debe poder:

- Ejecutar la PoC con `docker compose up --build`.
- Subir un PDF o texto, visualizar que queda en cola y obtener material de estudio cuando termina el worker.
- Ver RabbitMQ, sus colas y el procesamiento de eventos durante la demo.
- Generar flashcards y preguntas sin depender de Ollama ni de un modelo local.
- Registrar respuestas y recomendar los temas con menor dominio para practicar.
- Ejecutar el flujo de demostracion con datos de prueba y resultados esperados documentados.
- Entregar un README operativo, white paper de hasta cinco paginas, diagramas y una version desplegada en la nube.

## Arquitectura objetivo

```text
Alumno -> Next.js web -> API de materiales -> RabbitMQ
                                            |
                                            v
                                      Worker de procesamiento
                                (chunking -> embeddings -> generacion)
                                            |
                                            v
                    Supabase Edge / PostgreSQL + pgvector   Vercel AI Gateway
                                            |
                                            v
                             UI: estado del material + practica + refuerzo
```

### Eventos

| Evento | Productor | Consumidor | Resultado |
|---|---|---|---|
| `material.uploaded` | API de materiales | Worker | Inicia el procesamiento asincronico. |
| `material.ready` | Worker | UI / futuro notificador | Habilita el material para estudiar. |
| `material.failed` | Worker | UI / soporte | Muestra error recuperable y conserva trazabilidad. |

Cada mensaje incluira `eventId`, `jobId`, `materialId`, `userId`, `attempt` y fecha. El worker confirmara el mensaje solo despues de persistir el resultado. Los errores recuperables se reintentaran hasta tres veces y luego pasaran a una DLQ.

## Tablero de tareas

> Las casillas se marcaran a medida que se complete y verifique cada tarea. No se considerara terminado un bloque sin su criterio de aceptacion.

### 0. Alcance, seguridad y configuracion

- [x] Revisar requisitos del TP y estado actual del repositorio.
- [x] Elegir RabbitMQ como tecnologia del eje tecnico.
- [x] Elegir Vercel AI Gateway para eliminar la dependencia de Ollama.
- [x] Configurar `AI_GATEWAY_API_KEY` y un modelo de texto gratuito; los embeddings se generan en Supabase, no en Vercel.
- [x] Verificar una respuesta de texto del modelo gratuito de Vercel y un vector de Supabase de 384 dimensiones.
- [ ] Mantener claves solo en `.env.local` y secretos del despliegue; no versionarlas ni enviarlas al navegador.

**Criterio de aceptacion:** la aplicacion arranca sin Ollama y devuelve un error util, sin exponer secretos, cuando falta la clave de Vercel.

### 1. Adaptador de IA por Vercel AI Gateway

- [ ] Instalar solo las dependencias necesarias para consumir la API compatible de Vercel AI Gateway.
- [ ] Reemplazar el cliente de Ollama por un adaptador de IA del servidor usando `AI_GATEWAY_API_KEY` y el endpoint de Vercel.
- [ ] Mantener el contrato actual de generacion de flashcards y multiple choice.
- [ ] Usar salida estructurada y validar que la IA devuelva exactamente el formato esperado.
- [x] Reemplazar los embeddings locales por embeddings de Supabase Edge Functions `gte-small`.
- [ ] Verificar migracion de pgvector y volver a cargar los documentos anteriores; no se eliminan los vectores previos.
- [ ] Conservar limites de contenido, validacion de archivos y mensajes de error claros.

**Criterio de aceptacion:** un tema y un material RAG generan contenido valido con Gateway; no hay ninguna referencia funcional a `OLLAMA_*`.

### 2. RabbitMQ, eventos y procesamiento asincronico

- [x] Agregar la libreria de RabbitMQ y un modulo de conexion reutilizable.
- [ ] Definir exchange, colas durables, routing keys y DLQ.
- [ ] Crear el contrato tipado de eventos y validarlo antes de publicar o consumir.
- [x] Agregar persistencia para estado del trabajo: `queued`, `processing`, `ready`, `failed`, error, intentos y timestamps.
- [ ] Cambiar la carga de material: guardar el trabajo, publicar `material.uploaded` y responder sin esperar la IA.
- [x] Crear un proceso worker independiente que consuma y procese materiales.
- [x] Ejecutar en el worker: chunking, embeddings, indexado y generacion inicial de contenido de estudio.
- [ ] Implementar idempotencia por `jobId`/`materialId` para que un mensaje repetido no duplique resultados.
- [ ] Implementar tres reintentos y movimiento a DLQ ante fallas recuperables.
- [ ] Publicar `material.ready` o `material.failed` y reflejar el estado en la interfaz.

**Criterio de aceptacion:** subir un PDF devuelve estado `queued`; RabbitMQ entrega el evento al worker; el material termina en `ready` y se puede estudiar. Al detener la IA o el worker se observa reintento y DLQ sin perder el trabajo.

### 3. Funcionalidad "Temas a reforzar"

- [x] Verificar la base ya existente: intentos persistidos, dominio por tema y dificultad adaptativa.
- [x] Crear una consulta de temas debiles: minimo cinco intentos, orden por menor dominio y desempate por cantidad de errores.
- [x] Exponer el resumen desde una funcion de servidor con RLS y sin mostrar informacion de otros usuarios.
- [x] Agregar al inicio una seccion "Temas a reforzar" con tema, precision, intentos y prioridad.
- [x] Mostrar estados: necesita refuerzo (<40%), en progreso (40-75%) y dominado (>75%).
- [x] Agregar "Practicar este tema", que abre multiple choice con tema y nivel precargados y usa la dificultad adaptativa existente al generar.
- [x] Mostrar un estado vacio claro cuando todavia no haya suficientes respuestas.

**Criterio de aceptacion:** despues de contestar al menos cinco preguntas de dos temas, el dashboard prioriza el de menor dominio y permite iniciar una practica dirigida.

### 4. Docker Compose y datos de demostracion

- [x] Crear un Dockerfile de produccion para la aplicacion web.
- [x] Crear un Dockerfile o comando de inicio especifico para el worker.
- [ ] Crear `compose.yaml` con web, worker, RabbitMQ con panel de administracion y PostgreSQL/pgvector para los datos de la PoC.
- [ ] Incluir health checks y esperar RabbitMQ/base antes de iniciar consumidores.
- [ ] Agregar migraciones y datos de prueba reproducibles.
- [ ] Documentar como inyectar credenciales de Supabase y Vercel sin agregarlas al repositorio.
- [ ] Verificar desde cero `docker compose up --build` y registrar el resultado.

**Criterio de aceptacion:** una persona que clone el repositorio, configure sus variables y ejecute un solo comando puede levantar todos los servicios necesarios para repetir la PoC.

### 5. Calidad, pruebas y observabilidad

- [x] Completar pruebas de priorizacion y umbrales de refuerzo; las pruebas de normalizacion y distribucion adaptativa tambien pasan.
- [ ] Agregar pruebas para contratos de eventos, idempotencia y reintentos.
- [x] Ejecutar y documentar una prueba smoke con usuario y material temporales: cola, worker, vectores, tarjetas y denegacion a anonimos. Falta automatizarla en CI sin secretos reales.
- [ ] Registrar duracion del trabajo, intentos, estado de cola y fallas, sin registrar prompts ni datos de alumnos.
- [x] Actualizar CI para ejecutar lint, build y pruebas.
- [ ] Ejecutar lint, build y pruebas antes de cada entrega.

**Criterio de aceptacion:** CI final en verde y evidencia de al menos un flujo exitoso y una falla recuperada.

### 6. Documentacion de entrega - 19 de noviembre

- [ ] Reescribir README: arquitectura, prerequisitos, variables, arranque, datos de prueba, endpoints/eventos y resultados esperados.
- [ ] Crear el diagrama de despliegue y el diagrama de secuencia del procesamiento.
- [ ] Redactar white paper de hasta cinco paginas: problema, producto, decision RabbitMQ, comparativa, atributos de calidad, trade-offs, PoC y resultados.
- [ ] Documentar tres escenarios de calidad medibles: rendimiento, disponibilidad y modificabilidad.
- [ ] Documentar la comparativa RabbitMQ vs. Kafka vs. n8n y justificar la decision.
- [ ] Desplegar web, worker y broker/servicios requeridos en cloud; registrar URL y credenciales de evaluacion por canal seguro.
- [ ] Hacer una prueba de entrega desde una sesion limpia.

**Criterio de aceptacion:** repositorio, documento, URL, credenciales de demo y comandos de ejecucion cumplen los entregables de la consigna.

### 7. Defensa - 26 de noviembre

- [ ] Preparar exposicion de diez minutos: problema, producto, decision, arquitectura, stack, calidad, trade-offs y recursos.
- [ ] Preparar demo de diez minutos: carga, cola, worker, resultado, practica y tema a reforzar.
- [ ] Preparar evidencia de DLQ/reintento por si la falla en vivo no es conveniente.
- [ ] Preparar respuestas a: por que RabbitMQ, por que no Kafka, idempotencia, consistencia eventual, seguridad, costos y escalado.
- [ ] Ensayar dos veces con cronometro y un usuario de demo.

**Criterio de aceptacion:** la exposicion completa cabe en 10 + 10 minutos y no depende de improvisar configuraciones o credenciales.

## Orden de ejecucion inmediato

1. Configurar Vercel AI Gateway y el adaptador de IA.
2. Crear RabbitMQ + worker + estados de procesamiento.
3. Integrar el flujo de carga y visualizacion de estado.
4. Completar "Temas a reforzar" aprovechando el motor adaptativo existente.
5. Docker Compose, migraciones y pruebas.
6. README, white paper, despliegue y ensayo.

## Datos necesarios del responsable del proyecto

- Una clave `AI_GATEWAY_API_KEY` creada en el panel de Vercel AI Gateway.
- Seleccion de modelos de texto y embeddings disponibles para el credito gratuito al momento de configurar el proyecto.
- Acceso a la cuenta elegida para el despliegue cloud y a las credenciales de Supabase existentes.

Las claves no se deben pegar en este archivo, en GitHub ni en el chat.
