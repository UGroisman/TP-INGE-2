# Guion de defensa — Ingeniería de Software II

Este guion es una preparación: completar integrantes, resultados medidos, URL y tiempos reales antes de la defensa. No afirmar como probado un escenario que todavía no se ejecutó.

## Exposición: 10 minutos incluyendo setup

| Tiempo | Contenido |
|---|---|
| 0:00–1:30 | Problema: materiales dispersos, esfuerzo de preparación y dificultad para reconocer temas débiles. Producto y usuario destinatario. |
| 1:30–3:00 | Funcionalidades: carga de PDF/TXT, flashcards, opción múltiple, sets, historial y refuerzo por tema. Delimitar la PoC. |
| 3:00–5:30 | Historia principal y arquitectura: carga, trabajo persistido, RabbitMQ, worker, embeddings de Supabase y estado listo. |
| 5:30–7:30 | Búsqueda vectorial, contexto enviado al modelo gratuito y preguntas; explicar que gte-small está orientado a inglés y no garantiza exactitud. |
| 7:30–9:00 | Decisión RabbitMQ frente a Kafka/n8n; rendimiento percibido, recuperabilidad, consistencia eventual y costo operativo. |
| 9:00–10:00 | Stack, recursos, evidencia medida y riesgos: servicios externos, publicación no atómica, límites gratuitos y estado del despliegue. |

## Demo: 10 minutos

1. Iniciar sesión con un usuario de prueba y mostrar un apunte breve en inglés que contenga texto seleccionable.
2. Subir el material; mostrar estado en cola/procesando y la cola `material-processing` en RabbitMQ.
3. Cuando figure listo, seleccionarlo y pedir preguntas o flashcards sobre un tema contenido en el texto.
4. Mostrar los fragmentos y vectores solo si se dispone de una vista segura; explicar que el contenido se recupera antes de generar.
5. Responder preguntas para registrar intentos; abrir Inicio y mostrar el tema a reforzar. Si no hay cinco respuestas de ese tema, usar una cuenta de prueba preparada previamente.
6. Mostrar la evidencia de una falla y reintento solo después de haberla probado; no improvisar alteraciones de credenciales en la defensa.

## Preguntas posibles

- **¿Por qué no procesar todo en el request?** La cola permite devolver el estado de aceptación y desacoplar el trabajo costoso; agrega espera eventual y operación.
- **¿Por qué RabbitMQ y no Kafka?** Se buscó una cola de trabajo simple para una PoC, no retención prolongada ni replay de un flujo de gran escala.
- **¿Qué pasa si se entrega dos veces?** Existe una clave única por documento y posición y se usa upsert; hay que probar concurrencia y caídas para delimitar esta propiedad.
- **¿Se pierde un trabajo si falla la publicación?** La base y RabbitMQ no están unidos por una transacción. Hay una ventana de inconsistencia; outbox es una mejora necesaria.
- **¿El RAG garantiza que las respuestas sean correctas?** No. Recuperar fragmentos limita el contexto, pero hay que evaluar relevancia y revisar las respuestas generadas.
- **¿Es todo local y autocontenido?** No actualmente: Compose levanta web, worker y RabbitMQ; Supabase y la IA son externos. Explicar la brecha con la consigna y su resolución acordada.

## Mediciones a completar

- Tiempo de aceptación de la carga: pendiente.
- Tiempo hasta material listo y cantidad/tamaño de fragmentos: pendiente.
- Prueba de caída, reintento y DLQ: pendiente.
- Recursos y costos estimados del producto real: pendiente de dimensionar.
- URL cloud y acceso de evaluación: pendiente.
