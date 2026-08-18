import type { ExerciseTranslation } from '../types';

/**
 * Spanish text for the built-in exercises, keyed by exercise id.
 *
 * What is translated is what the student is *told*: the brief, the task, the
 * tips, the requirements, the scaffold in the editor. What is not translated is
 * `testInput` — the material a prompt runs against.
 *
 * That omission is deliberate and worth stating, because it looks like an
 * oversight. The material is the problem, not the packaging: the feedback log
 * is what the schema has to survive, the transcript is where the ambiguity
 * lives, the clinical shorthand is the thing that has to be made readable.
 * Translating it would hand two students two different problems and then score
 * them on one rubric. It is the same reason the material lives server-side and
 * every attempt at an exercise runs against an identical copy of it.
 *
 * `evaluatorNotes` is absent for the same reason from the other direction — the
 * grader reads the canonical exercise, always.
 */
export const ES_EXERCISES: Record<string, ExerciseTranslation> = {
  'clear-prompts': {
    title: 'Prompts claros',
    tagline: 'Di exactamente lo que quieres',
    topic: 'Especificidad',
    brief:
      'Casi toda salida decepcionante de una IA se remonta a un prompt que dejó algo a la adivinanza. Un prompt claro fija cuatro cosas: la tarea, la audiencia, las restricciones y la forma de la respuesta. Cuando falta cualquiera de ellas, el modelo rellena el hueco con una suposición promedio — y lo promedio rara vez es lo que querías.',
    task:
      'Escribe un solo prompt que pida una explicación breve de cómo funciona una comisión por descubierto bancario, dirigida a alguien de 15 años que nunca ha tenido una cuenta. Tu prompt debe dejar la audiencia, la extensión, el tono y la estructura de la salida imposibles de malinterpretar.',
    tips: [
      'Declara la audiencia explícitamente — "para alguien de 15 años" es mejor que "hazlo simple".',
      'Da una extensión medible ("menos de 120 palabras", "exactamente 3 viñetas"), no "corto".',
      'Describe la forma de la salida antes de describir el contenido.',
      'Nombra lo que hay que dejar fuera. Las exclusiones también son restricciones.',
      'Relee tu prompt y pregúntate: ¿podría un desconocido cuidadoso entenderlo mal? Arregla todo lo que pueda.',
    ],
    successCriteria: [
      'El prompt nombra la audiencia y el nivel de conocimiento que se le supone',
      'El prompt especifica una extensión concreta y comprobable',
      'El prompt define la estructura de la salida (párrafo, viñetas, secciones)',
      'El prompt fija un tono o nivel de lectura',
      'La salida que vuelve no necesita ninguna aclaración adicional',
    ],
    starterPrompt:
      'Explica qué es una comisión por descubierto bancario.\n\n<!-- Ese prompt es el "antes". Reescríbelo abajo para que la audiencia, la extensión, el tono y la forma de la salida sean todos explícitos. Borra este comentario al entregar. -->\n',
  },

  'role-playing': {
    title: 'Asignar un rol',
    tagline: 'Dale al modelo un asiento en la mesa',
    topic: 'Personajes',
    brief:
      'Asignar un rol cambia a qué conocimiento recurre el modelo y en qué registro escribe. "Eres una enfermera pediátrica explicándole a un padre preocupado" activa un vocabulario distinto, prioridades distintas y advertencias distintas que la misma pregunta hecha en frío. La técnica vale tanto como la concreción del rol: un rol es un trabajo, una audiencia, un objetivo y un conjunto de cosas que esa persona nunca diría.',
    task:
      'Escribe un prompt que ponga a Claude en el papel de un experto concreto revisando el primer currículum de un principiante. El personaje debe tener un trabajo definido, una relación definida con quien lee, un objetivo declarado para la revisión y al menos un límite explícito sobre lo que no debe hacer.',
    tips: [
      'El puesto por sí solo es poco. Añade años, entorno y qué le importa a esa persona.',
      'Define la relación — un mentor y un filtro de selección dan retroalimentación muy distinta.',
      'Declara el objetivo del personaje para esta interacción, no solo su identidad.',
      'Añade un límite: "nunca lo reescribas por él", "no comentes el formato".',
      'Un personaje que se negaría a responder algo es un personaje con bordes reales.',
    ],
    successCriteria: [
      'El personaje tiene un trabajo, un entorno y un nivel de experiencia concretos',
      'Se declara la relación del personaje con quien lee',
      'El personaje tiene un objetivo explícito para la revisión',
      'Se detalla al menos una cosa que el personaje no hará',
      'La salida suena con la voz del personaje, no con voz genérica de asistente',
    ],
    starterPrompt:
      'Eres un orientador laboral. Revisa este currículum.\n\n<!-- Personaje pobre: sin entorno, sin objetivo, sin límites. Reconstrúyelo abajo. -->\n',
  },

  'json-output': {
    title: 'Salida en JSON',
    tagline: 'Produce algo que una máquina pueda consumir',
    topic: 'Salida estructurada',
    brief:
      'En cuanto la salida alimenta a un programa en lugar de a una persona, la prosa se vuelve un lastre. Necesitas un conjunto fijo de claves, tipos predecibles y una respuesta definida para el caso ausente. Esta es la habilidad que convierte un juguete conversacional en un componente de un sistema — y los modos de fallo no perdonan: una frase suelta fuera de las llaves y el parseo revienta.',
    task:
      'Escribe un prompt que extraiga datos estructurados de los comentarios de clientes de abajo hacia un array JSON estricto. Cada elemento debe llevar: un id, el sentimiento, una categoría, un resumen de una línea y una urgencia del 1 al 5. Define cada campo, su tipo y sus valores permitidos dentro del propio prompt, y di qué hacer cuando un campo no se pueda determinar.',
    tips: [
      'Muestra el esquema exacto — nombres de clave, tipos y valores permitidos.',
      'Incluye un objeto de ejemplo completo. La ambigüedad de un esquema la resuelve el ejemplo.',
      'Di explícitamente: nada de prosa, nada de bloques de markdown, nada de comentarios al final.',
      'Define el caso nulo. "Usa null cuando la categoría no esté clara" evita que se invente.',
      'Restringe los enums enumerándolos. Un campo "categoría" abierto se irá desviando.',
    ],
    successCriteria: [
      'Cada campo se nombra con un tipo explícito en el prompt',
      'Los campos enumerados listan sus valores permitidos',
      'El prompt prohíbe cualquier salida fuera del JSON',
      'El caso ausente o desconocido tiene una representación definida',
      'La salida devuelta se parsea como JSON válido al primer intento',
    ],
    starterPrompt:
      'Saca la información útil de estos comentarios y dámela en JSON.\n\n<!-- Sin esquema, sin tipos, sin valores permitidos, sin regla para los nulos. Especifícalo todo abajo. -->\n',
  },

  'multi-step': {
    title: 'Razonamiento por etapas',
    tagline: 'Descompón antes de delegar',
    topic: 'Descomposición',
    brief:
      'Las tareas difíciles fallan cuando se entregan enteras. La solución es nombrar las etapas, definir qué produce cada una y hacer que cada una dependa de la anterior. Descomponer también hace legible el fallo: cuando la respuesta está mal puedes ver qué etapa falló, en vez de volver a tirar los dados con todo.',
    task:
      'Escribe un prompt que tome el informe de incidente de abajo y produzca un análisis de causa raíz mediante etapas explícitamente nombradas: establecer la cronología, identificar factores contribuyentes, separar la causa raíz de los síntomas y proponer medidas de prevención. Cada etapa debe declarar qué produce y cómo la siguiente lo usa.',
    tips: [
      'Nombra y numera las etapas. Las etapas sin nombre se funden.',
      'Declara qué produce cada etapa antes de decir qué debe considerar.',
      'Haz explícita la dependencia: "usando únicamente la cronología del paso 1…".',
      'Añade una comprobación entre etapas — "si la cronología tiene huecos, márcalos antes de seguir".',
      'Di cómo deben aparecer las etapas en la salida final, o se colapsarán en una sola.',
    ],
    successCriteria: [
      'Las etapas están nombradas y ordenadas una a una',
      'Cada etapa tiene una salida definida',
      'Al menos una etapa consume explícitamente la salida de una etapa anterior',
      'El prompt exige distinguir causa raíz de síntoma',
      'La salida final muestra las etapas por separado en lugar de una respuesta fundida',
    ],
    starterPrompt:
      'Analiza este incidente y dime qué salió mal y cómo prevenirlo.\n\n<!-- Una sola petición indiferenciada. Divídela abajo en etapas nombradas y dependientes. -->\n',
  },

  'prompt-debugging': {
    title: 'Depurar prompts',
    tagline: 'Diagnostica y luego repara',
    topic: 'Diagnóstico',
    brief:
      'La última habilidad es arreglar prompts que ya existen — normalmente de otra persona y normalmente con prisa. Depurar un prompt es como depurar código: formula una hipótesis sobre qué instrucción produce el mal comportamiento, cambia una sola cosa y comprueba si la salida se movió. Reescribir desde cero no es depurar; tira a la basura la información que hay en el fallo.',
    task:
      'Abajo está el prompt roto. Se supone que produce una actualización semanal de estado concisa para un jefe de ingeniería, pero devuelve texto divagante que entierra lo importante e inventa detalles. Diagnostícalo y escribe tu versión reparada. En tu reflexión, nombra cada defecto concreto que encontraste y el cambio que hiciste para cada uno.',
    tips: [
      'Lee el prompt roto buscando instrucciones contradictorias antes de reescribir nada.',
      'Busca instrucciones que inviten a inventar — "desarrolla", "rellena los huecos".',
      'Fíjate en instrucciones de extensión que pelean con los requisitos de contenido.',
      'Comprueba si se declara el orden de prioridad. El contenido sin orden se ordena al azar.',
      'Cambia un defecto cada vez y anota qué se movió. Eso es lo que significa "depurar".',
    ],
    successCriteria: [
      'Cada defecto del original se nombra concretamente, no se resume como "era vago"',
      'Cada defecto nombrado tiene su arreglo correspondiente en el prompt reparado',
      'La reparación conserva lo que funcionaba en vez de empezar de cero',
      'La reflexión liga cada cambio con el comportamiento que pretendía corregir',
      'El prompt reparado produce una actualización ceñida, priorizada y sin invenciones',
    ],
    starterPrompt:
      'PROMPT ROTO — diagnostícalo y luego escribe tu versión reparada abajo.\n\n"""\nEres un asistente. Escribe una actualización semanal de estado realmente completa y detallada\npara mi jefe a partir de las notas que te doy. Sé exhaustivo e incluye todo, pero\ntambién que sea breve. Que suene profesional e impresionante. Si algo en mis notas\nno está claro o está incompleto, usa tu criterio para desarrollarlo y rellenar los detalles\npara que se lea bien. Cubre toda la semana. No dejes nada fuera. Sé conciso también.\n"""\n\n--- TU PROMPT REPARADO ABAJO ---\n',
  },

  'discharge-instructions': {
    title: 'Instrucciones de alta',
    tagline: 'Traduce el conocimiento experto sin añadirle nada',
    topic: 'Lenguaje claro',
    scenario: {
      role: 'Una enfermera redactando notas de alta en una clínica comunitaria',
      context:
        'Las notas clínicas de un paciente que se va a casa son exactas y completamente ilegibles para la persona de la que hablan. Tienes seis minutos antes del siguiente paciente.',
      stakeholder: 'El paciente, y quien esté en casa con él esta noche',
      atStake:
        'Una dosis saltada o una señal de alarma ignorada lo devuelve por la puerta en tres días.',
    },
    brief:
      'Reescribir lenguaje experto para la persona a la que concierne es el uso real más común de un modelo de lenguaje, y el de peor modo de fallo. Simplificar es fácil. Simplificar sin añadir es difícil: a un modelo al que se le pide hacer amables unas notas clínicas tapará un hueco inventándose una tranquilización, una dosis o un plazo que nadie escribió. La habilidad aquí es construir un prompt que haga explícita la frontera entre traducir y añadir — y que diga en voz alta qué hacer cuando la fuente calla.',
    task:
      'Escribe un prompt que convierta las notas de alta de abajo en instrucciones para casa que el paciente pueda seguir, a un nivel de lectura de sexto de primaria aproximadamente. La salida debe cubrir la medicación, las señales de alarma y el seguimiento. Tu prompt debe prohibir añadir cualquier cosa que las notas no contengan, y debe definir qué hacer donde las notas estén incompletas — un hueco tiene que aparecer como hueco, no rellenarse.',
    tips: [
      'Nombra el nivel de lectura y a quien lee. "Simple" no es una especificación.',
      'Di lo que el modelo no puede hacer — inventar dosis, añadir consejos, tranquilizar — tan claro como lo que sí debe hacer.',
      'Dale a los huecos un sitio adonde ir: una lista de "consúltalo en la clínica" es mejor que el silencio.',
      'Ordena las secciones por lo que importa esta noche, no por el orden de las notas.',
      'Lee la salida como si fueras el paciente. Todo lo que no puedas ejecutar no es una instrucción.',
    ],
    successCriteria: [
      'El prompt declara quién lee y un nivel de lectura concreto',
      'El prompt prohíbe añadir información que no esté en las notas',
      'El prompt define un tratamiento explícito para el detalle incompleto o ausente',
      'El prompt fija las secciones y su orden',
      'Cada afirmación de la salida puede rastrearse hasta algo de las notas',
    ],
    starterPrompt:
      'Reescribe estas notas de alta para que un paciente las entienda.\n\n<!-- Eso simplificará — y también inventará por su cuenta. Reconstrúyelo abajo separando traducir de añadir, y di qué pasa donde las notas callan. -->\n',
  },

  'support-triage': {
    title: 'Triaje de soporte',
    tagline: 'Decide qué puede responder una máquina',
    topic: 'Enrutamiento y límites',
    scenario: {
      role: 'La persona a cargo del soporte de primera línea en un equipo pequeño',
      context:
        'Entraron cuarenta mensajes durante la noche. La reunión diaria es en veinte minutos y la cola tiene que estar clasificada, priorizada y en parte respondida antes.',
      stakeholder: 'La ingeniera de guardia, el equipo de facturación y cada cliente que sigue esperando',
      atStake:
        'Un cobro duplicado metido en la cola de errores durante tres días es el que acaba en redes sociales.',
    },
    brief:
      'El triaje es donde la salida estructurada deja de ser un ejercicio de formato. El esquema es fácil; el criterio no. Todo prompt de triaje real tiene que responder algo que el esquema no puede: ¿a cuáles de estos puede contestar la máquina sola, y cuáles deben llegar intactos a una persona? Un prompt que redacta una respuesta segura de sí misma a una disputa de facturación no le ha ahorrado tiempo a nadie — ha creado un segundo problema. La instrucción valiosa es la que dice cuándo parar.',
    task:
      'Escribe un prompt que haga triaje de los mensajes de soporte de abajo. Para cada uno debe asignar una cola de un conjunto fijo, una severidad, cualquier identificador de pedido o cuenta mencionado y un resumen de una línea. También debe redactar una primera respuesta — pero solo para los mensajes que sea seguro contestar sin una persona, y tu prompt debe definir esa frontera de forma explícita en vez de dejarla al criterio del modelo.',
    tips: [
      'Fija las colas y las severidades como valores enumerados. Una "categoría" abierta se desvía para el tercer mensaje.',
      'Escribe la regla de no-responder como una prueba que el modelo pueda aplicar, no como una intuición: dinero, pérdida de datos, temas legales, seguridad.',
      'Di qué poner en el campo de respuesta cuando la regla dice que no se responda — una cadena vacía y un motivo es mejor que una disculpa.',
      'Extrae los identificadores literalmente. Un número de pedido reformateado es un número de pedido equivocado.',
      'Ordena o prioriza la salida, o alguien seguirá teniendo que leer los cuarenta para encontrar el urgente.',
    ],
    successCriteria: [
      'Las colas y los niveles de severidad se enumeran en el prompt con su significado',
      'Una regla declarada y comprobable decide a qué mensajes se les puede responder automáticamente',
      'La salida define qué aparece en el campo de respuesta cuando se retiene la respuesta automática',
      'Los identificadores se extraen tal como están escritos, o se informan como ausentes',
      'La salida está ordenada de modo que lo más urgente se encuentre sin leerla entera',
    ],
    starterPrompt:
      'Ordena estos mensajes de soporte por urgencia y escribe respuestas.\n\n<!-- Esto prometerá un reembolso encantado de la vida. Reconstrúyelo abajo: colas fijas, una escala de severidad, una regla de extracción y una prueba explícita de cuándo NO redactar una respuesta. -->\n',
  },

  'minutes-to-actions': {
    title: 'De acta a acuerdos',
    tagline: 'Separa lo que se decidió de lo que se dijo',
    topic: 'Decisiones y responsables',
    scenario: {
      role: 'Secretaría de un concejo municipal',
      context:
        'Noventa minutos de discusión grabada tienen que convertirse en un registro de acuerdos publicable para el viernes. La mitad de lo que se dijo era pensar en voz alta.',
      stakeholder: 'Los vecinos que leen el registro publicado, y los funcionarios que deben ejecutarlo',
      atStake: 'Un acuerdo sin responsable con nombre es un acuerdo que nadie hace, en público.',
    },
    brief:
      'Las notas de una reunión son casi todo discusión; un registro es solo decisiones. Ir de una cosa a la otra exige trazar una línea que la transcripción no traza — que alguien diga "habría que mirar eso" no es una decisión, y un modelo al que le pides acuerdos lo ascenderá a decisión, le inventará un responsable y le pondrá fecha. Este ejercicio va de diseñar la prueba que separa ambas cosas, y de hacer visible el caso dudoso en vez de resolverlo.',
    task:
      'Escribe un prompt que convierta la transcripción de abajo en un registro de acuerdos. Cada entrada necesita el acuerdo, un responsable con nombre, una fecha límite y el estado de la decisión que hay detrás. Tu prompt debe definir qué cuenta como decisión frente a discusión, y debe marcar como dudoso todo lo que la transcripción deje ambiguo en lugar de resolverlo.',
    tips: [
      'Define "decisión" con una prueba — alguien se comprometió, o quien preside lo confirmó — no como una etiqueta.',
      'Los responsables deben salir de nombres realmente pronunciados. Di qué hacer cuando no se nombró a nadie.',
      'Las fechas son el mismo problema: "pronto" no es una fecha, y el modelo no debería convertirlo en una.',
      'Dale al caso ambiguo su propio lugar en la salida. Lo que no lo tiene se resuelve solo y en silencio.',
      'Separa el registro del resumen de la discusión, o los dos se mezclarán en una narración.',
    ],
    successCriteria: [
      'El prompt da una prueba comprobable de qué cuenta como decisión',
      'Los responsables salen de personas nombradas, con un recurso definido cuando no se nombró a nadie',
      'Los plazos vagos se conservan como vagos en vez de convertirse en fechas',
      'Los puntos ambiguos aparecen en la salida marcados como dudosos',
      'El registro se puede separar de la discusión — se puede actuar sobre él por sí solo',
    ],
    starterPrompt:
      'Resume esta reunión y lista los acuerdos.\n\n<!-- Esto inventará responsables y ascenderá comentarios sueltos a decisiones. Reconstrúyelo abajo con una prueba para lo que cuenta como decisión y un sitio para lo que quede dudoso. -->\n',
  },

  'privacy-safe-summary': {
    title: 'Sin nombres, con señal',
    tagline: 'Restringe lo que puede salir de la sala',
    topic: 'Diseño de restricciones',
    scenario: {
      role: 'Analista en un equipo de personas',
      context:
        'La dirección quiere los temas de los informes de incidentes de este trimestre. Los informes nombran a personas, y el resumen se reenviará más lejos de lo que puedas seguir.',
      stakeholder: 'Un equipo directivo que no debe llegar a saber quién presentó qué',
      atStake:
        'Un solo detalle identificativo y la persona que lo denunció queda identificada — ante quienes denunció.',
    },
    brief:
      'Casi todo el trabajo con prompts va de sacar más. Este va de sacar menos: el resumen tiene que llevarse el patrón y dejar a las personas. Es más difícil de lo que parece, porque la identidad sobrevive a la censura. Tacha los nombres y "la supervisora del turno de noche del muelle de carga" sigue identificando exactamente a una persona. Un prompt que funcione tiene que definir qué significa identificativo para este material, decir qué hacer cuando un tema no se puede informar sin exponer a alguien, y negarle al modelo su costumbre de ser servicialmente concreto.',
    task:
      'Escribe un prompt que convierta los informes de incidentes de abajo en un resumen de temas para un público directivo. Nadie de la fuente puede quedar identificable en la salida — ni por su nombre, ni por una combinación de puesto, turno y lugar que apunte a una sola persona. Tu prompt debe definir qué cuenta como identificativo aquí, y debe decir qué debe hacer la salida con un tema que no se pueda informar de forma segura.',
    tips: [
      'Tachar nombres es la mitad fácil. Di qué hacer con puestos, turnos, fechas y lugares que se combinan.',
      'Dale una instrucción al caso que no se puede informar: suprimido con un motivo es mejor que desaparecido en silencio.',
      'Los umbrales de agregación son una herramienta real — "informa solo temas que aparezcan en dos o más informes".',
      'Prohíbe citar. Una frase literal es una huella dactilar aunque se quite el nombre.',
      'Contrasta tú mismo la salida con la fuente. Si tú puedes deducir quién es, un compañero también.',
    ],
    successCriteria: [
      'El prompt define identificativo más allá de los nombres — puesto, lugar, turno, fechas, combinaciones',
      'Una regla declarada decide cuándo se informa un tema y cuándo se retiene',
      'Los temas retenidos aparecen como retenidos, con un motivo, en lugar de desvanecerse',
      'El prompt prohíbe la cita literal de los informes',
      'Ninguna persona de la fuente puede identificarse a partir del resumen producido',
    ],
    starterPrompt:
      'Resume estos informes de incidentes en temas para la dirección y quita los nombres.\n\n<!-- Quitar nombres no es lo mismo que quitar la identidad. Reconstrúyelo abajo: define qué significa identificativo para este material y di qué pasa con un tema que no se pueda contar de forma segura. -->\n',
  },
};
