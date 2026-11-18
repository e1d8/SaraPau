// Els grups dels caps i els seus retalls mantenen les futures fotos lligades al cos.
export function weddingCouple() {
  return `<figure class="wedding-couple" aria-label="El nuvi porta la núvia en braços i ella alça un ram de flors">
    <svg class="couple-illustration" viewBox="0 0 284 256" role="img" aria-labelledby="couple-title couple-description" focusable="false" xmlns="http://www.w3.org/2000/svg">
      <title id="couple-title">Junts, per a tot</title>
      <desc id="couple-description">Una parella de boda dibuixada a mà. El nuvi sosté la núvia per davall del vestit. Ella l’abraça pel coll i alça un ram. Els caps són dos ovals buits.</desc>
      <defs>
        <clipPath id="groom-face-clip">
          <ellipse cx="120" cy="56" rx="33" ry="43.5" transform="rotate(13 120 56)"/>
        </clipPath>
        <clipPath id="bride-face-clip">
          <ellipse cx="198" cy="90" rx="25.5" ry="30" transform="rotate(-8 198 90)"/>
        </clipPath>
      </defs>

      <path class="couple-ground ink-fine" d="M77 241c18 2 41 4 66 4"/>
      <g class="couple-sway">
        <path class="ink-fine" d="M48 84c-5-4-12-10-11-15 1-6 8-4 11 3 2-6 8-8 9-4 2 4-4 12-9 16Zm-22 7 5 4m39-24 5-3M44 151l-4-2m6 9-5 3"/>

        <!-- El braç dret de la núvia queda darrere del coll del nuvi. -->
        <path class="paper" d="M185 115c-18-11-37-18-57-20-13-1-26 0-36 5l3 8c12-4 23-5 33-3 17 3 34 11 50 21Z"/>

        <g class="groom">
          <path class="paper" d="M86 168c20 2 40 1 56 0 2 18 2 42 5 61-5 5-11 5-18 3-5-11-10-25-14-37-7 12-10 25-16 35-5 3-13 2-19-1 2-19 4-40 6-61Z"/>
          <path class="paper" d="M82 225c-5 0-10 3-11 7 5 3 18 4 25 2l3-6m31 0c0 4 2 8 6 10 6 1 14 2 19 0-2-5-6-8-10-10"/>
          <path class="ink-fine" d="M74 232c7 2 14 3 21 2m39 1c5 2 12 3 17 2m-63-20 3-15m47 5 2 15"/>
          <path class="paper" d="M98 93c-11 4-20 13-24 22-2 10 0 27 3 39 5 14 15 20 33 21 23 2 42-5 50-19-2-16-9-32-18-47-4-7-11-12-17-16Z"/>
          <path class="paper" d="M97 88c3 6 14 10 28 7l-4 14-19 1Z"/>
          <path d="m101 100 11 9 10-10m-20 3-7 11 9 2-4 7m23-21 10 12-9 4 4 13m-15-19 5 16"/>
          <path class="ink-fine" d="M111 111c-2 5-2 9 0 13m8-19c9 9 14 16 17 27"/>
          <g id="groom-head" data-photo-placeholder="groom">
            <ellipse class="paper head-placeholder" cx="120" cy="56" rx="33" ry="43.5" transform="rotate(13 120 56)"/>
          </g>
        </g>

        <!-- Les mànegues i els avantbraços passen per davall del vestit. -->
        <path class="paper" d="M89 102c-9 10-14 24-15 37-1 9 4 13 12 13l13-3-2-10-13 2 6-20"/>
        <path class="paper" d="M130 100c13 3 20 13 30 21l15 17 15 4-2 11-13 1c-8 0-14-7-20-14l-18-20"/>
        <path class="ink-fine" d="m139 108 20 17 13 13m9 4-2 10m-90-12 2 10"/>

        <g class="couple-veil">
          <path class="paper" d="M213 106c8 7 9 21 16 35-3-1-6 0-8 3-3-2-6 0-8 3-3-1-6 0-8 3-3-2-6-1-8 1l8-36Z"/>
          <path class="ink-fine" d="M214 112c3 10 4 20 8 28m-13-18c1 9 0 16-2 22"/>
        </g>
        <g class="couple-bouquet-arm">
          <path class="paper" d="M211 113c6-6 10-16 14-24l5-10 5 2-4 11c-3 10-7 21-15 28Z"/>
          <path d="M230 84c8-12 14-27 20-42m-21 43c10-9 24-23 36-31m-34 29c3-14 3-28 3-42m1 34c-6-9-14-10-16-16 7-3 14 7 16 16Zm7-9c2-8 7-14 12-14-1 6-6 11-12 14Z"/>
          <path class="paper" d="M235 48c-4-1-9-6-9-10 0-4 5-6 8-2 3-5 9-5 10 0 1 5-5 10-9 12Zm18 1c-5 0-8-4-7-8-2-4 0-8 5-8 4-4 9-1 10 4 4 1 4 7 0 9-2 3-4 4-8 3Zm12 10c-5-1-7-5-5-8-1-4 3-7 7-5 4-2 8 2 7 6 0 5-5 7-9 7Z"/>
          <path class="ink-fine" d="M232 38c-1 3 1 5 3 5m17-4c4-3 7 1 4 4m9 6c3-2 5 1 3 4m-51-20-3 6m8 1-4 3"/>
          <path class="paper" d="M227 84c-1-3 2-6 5-7 3-1 5 1 3 3 3 0 3 3 0 4l-4 3Z"/>
        </g>

        <!-- La falda ampla deixa a la vista només les sabates i les mans que la sostenen. -->
        <g class="couple-skirt">
          <path class="paper" d="M47 103c-3-4-10-7-13-3-3 5 0 14 6 20l6 4 6-13Zm1 24c-5-3-9-1-8 4 1 4 6 7 12 8l4-7Z"/>
          <path class="paper" d="M203 115c-7 5-14 6-22 4-8 8-17 13-30 17-13 3-24-1-38-10-22-14-46-23-67-24-5 1-3 6-1 10 4 6 1 11 0 16-1 5 5 9 9 13 5 6 3 13 9 19 8 0 15-7 25-10 16-6 31 3 45 9 19 9 36 10 51-1 13-9 21-22 25-34 1-5-2-8-6-9Z"/>
          <path class="ink-fine" d="M49 118c25 2 44 9 64 20m-50 15c12-8 26-11 38-10m39 5c14 7 25 7 37 1m-18-15c14 3 29-2 37-10"/>
          <path class="paper" d="M92 146c-3-3-2-7 1-9l4-3c2-1 3 0 2 2l-2 3 5-3c2-1 4 0 2 2l-3 3 5-2c2 0 3 2 1 3l-6 5c-3 1-6 1-9-1Z"/>
          <path class="paper" d="M187 156c-3-3-1-7 2-10l4-4c2-1 4 0 3 2l-3 4 5-3c3-1 4 1 2 3l-4 3 4-1c2 0 3 2 1 3l-6 4c-3 2-6 1-8-1Z"/>
        </g>

        <g id="bride-head" data-photo-placeholder="bride">
          <ellipse class="paper head-placeholder" cx="198" cy="90" rx="25.5" ry="30" transform="rotate(-8 198 90)"/>
        </g>
      </g>
    </svg>
  </figure>`;
}
