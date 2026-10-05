import Link from "next/link";



const WHAT_YOUR_MONEY_DOES = [
  {
    amount: "$30",
    copy: "Feeds one animal for a month, including the prescription diets some of them need.",
  },
  {
    amount: "$75",
    copy: "Covers a full course of vaccinations for one animal in our care.",
  },
  {
    amount: "$250",
    copy: "Pays for a spay or neuter, a microchip, and the recovery care that follows.",
  },
];





const BANK_DETAILS = [
  { label: "Nombre de la cuenta", value: "Adoptame (cuenta de ejemplo)" },
  { label: "Número de ruta", value: "000000000" },
  { label: "Número de cuenta", value: "12345678" },
];

const Page = () => (
  <>
    
    <section className="bg-organic-accent-100">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20 lg:px-14">
        <h1 className="mb-5 font-display text-[clamp(34px,5vw,56px)] leading-[1.05] tracking-[-0.02em]">
          Donar
        </h1>
        <p className="max-w-[52ch] text-[16px] leading-[1.65] text-pretty text-organic-neutral-800">
          Everything given goes into the animals in our care — food, vaccinations,
          surgery, and the weeks of quiet recovery that come after.
        </p>
      </div>
    </section>

    <section
      aria-labelledby="what-your-money-does-heading"
      className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-14"
    >
      <h2
        id="what-your-money-does-heading"
        className="mb-7 font-display text-[32px]"
      >
        En qué se utiliza tu donación
      </h2>

      
      <dl className="m-0">
        {WHAT_YOUR_MONEY_DOES.map((tier) => (
          <div
            key={tier.amount}
            className="grid gap-1 border-b border-border py-6 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-baseline sm:gap-8"
          >
            <dt className="font-display text-[32px] leading-[1.1] text-organic-accent-700">
              {tier.amount}
            </dt>
            <dd className="m-0 max-w-[52ch] text-[15px] leading-[1.65] text-pretty text-organic-neutral-800">
              {tier.copy}
            </dd>
          </div>
        ))}
      </dl>
    </section>

    <section
      aria-labelledby="how-to-give-heading"
      className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-14"
    >
      <h2 id="how-to-give-heading" className="mb-7 font-display text-[32px]">
        Cómo donar
      </h2>

      
      <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <h3 className="mb-3 font-display text-[21px]">Transferencia bancaria</h3>

          <p className="mb-2">
            <span className="inline-flex items-center rounded-full bg-organic-accent-200 px-3.5 py-[5px] text-[12.5px] tracking-[0.02em] text-organic-accent-800">
              Datos de ejemplo
            </span>
          </p>
          <p className="mb-5 max-w-[46ch] text-[15px] leading-[1.65] text-pretty text-organic-neutral-800">
            This is a demonstration site and the numbers below are placeholders.
            They are not a real account, and a transfer sent to them will not
            reach anybody.
          </p>

          <dl className="m-0 mb-5">
            {BANK_DETAILS.map((detail) => (
              <div
                key={detail.label}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border py-3 last:border-b-0"
              >
                <dt className="text-[15px] text-muted-foreground">
                  {detail.label}
                </dt>
                <dd className="m-0 text-[15px] tracking-[0.02em] text-foreground">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>

          <p className="max-w-[46ch] text-[15px] leading-[1.65] text-pretty text-organic-neutral-800">
            Put your name in the reference so we know who to thank. If the gift
            is for a particular animal, add their name after yours.
          </p>
        </div>

        <div>
          <h3 className="mb-3 font-display text-[21px]">En persona</h3>
          <p className="mb-5 max-w-[46ch] text-[15px] leading-[1.65] text-pretty text-organic-neutral-800">
            Come to the front desk any day we are open. Cash, card and cheques
            are all fine, and you can ask for a receipt on the spot.
          </p>

          
          <dl className="grid gap-8 sm:grid-cols-2 sm:gap-10">
            <div>
              <dt className="mb-2 font-display text-[12px] tracking-[0.08em] text-organic-neutral-500 uppercase">
                Dirección
              </dt>
              <dd className="m-0 text-[17px] leading-[1.6] text-organic-neutral-800">
                248 Rescue Way
                <br />
                Brooklyn, NY 11201
              </dd>
            </div>

            <div>
              <dt className="mb-2 font-display text-[12px] tracking-[0.08em] text-organic-neutral-500 uppercase">
                Horario de atención
              </dt>
              <dd className="m-0 text-[17px] leading-[1.6] text-organic-neutral-800">
                Wednesday to Sunday
                <br />
                11am – 6pm
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>

    
    <section className="mx-auto w-full max-w-6xl px-5 pt-4 pb-16 sm:px-8 lg:px-14 lg:pb-20">
      <p className="max-w-[56ch] text-[16px] leading-[1.65] text-pretty text-organic-neutral-800">
        Giving regularly, a gift in memory of someone, or leaving something to
        us in your will — all of it is easier than it sounds, and we will walk
        you through it.{" "}
        <Link href="/contact" className="text-organic-accent-700 hover:underline">
          Contáctanos
        </Link>{" "}
        and ask for the donations team.
      </p>
    </section>
  </>
);

export default Page;
