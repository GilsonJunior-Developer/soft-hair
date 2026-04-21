import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWizardState } from '../actions';
import { Step1Salon } from './step-1-salon';
import { Step2Categories } from './step-2-categories';
import { Step3Prices } from './step-3-prices';
import { ProgressBar } from '@/components/ui/progress-bar';

export const dynamic = 'force-dynamic';

type Params = Promise<{ step: string }>;

export default async function StepPage({ params }: { params: Params }) {
  const { step } = await params;
  const stepNum = Number(step);

  if (!Number.isInteger(stepNum) || stepNum < 1 || stepNum > 3) {
    notFound();
  }

  const wizard = await getWizardState();

  // Gate: steps 2 and 3 require a salon
  if (stepNum >= 2 && !wizard.salonId) {
    return (
      <section className="flex flex-col gap-4 text-center">
        <ProgressBar current={stepNum} total={3} />
        <h1 className="text-xl font-semibold [color:var(--color-text-strong)]">
          Você precisa completar o passo 1 primeiro
        </h1>
        <Link
          href="/onboarding/1"
          className="text-sm underline [color:var(--color-accent-600)]"
        >
          Voltar para o passo 1
        </Link>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <ProgressBar current={stepNum} total={3} />
      {stepNum === 1 && <Step1Salon />}
      {stepNum === 2 && <Step2Categories />}
      {stepNum === 3 && (
        <Step3Prices
          categories={wizard.categories ?? []}
        />
      )}
    </section>
  );
}
