import React from 'react';
import { MdCheckCircle } from 'react-icons/md';
import { Badge } from '@/components/base-ui/badge';
import { Button } from '@/components/base-ui/button';
import { cn } from '@/lib/utils';

export interface PricingFeature {
  text: string;
}

export interface PricingPlan {
  id: string;
  title: string;
  description: string;
  price: string;
  priceSuffix?: string;
  features: PricingFeature[];
  buttonText: string;
  isPopular?: boolean;
}

export interface Pricing1Props {
  plans: PricingPlan[];
  className?: string;
  onSelectPlan?: (planId: string) => void;
}

export function Pricing1({ plans, className, onSelectPlan }: Pricing1Props) {
  return (
    <div className={cn('mx-auto w-full max-w-[1380px] px-4 md:px-6 py-4 md:py-8', className)}>
      <div className="bg-muted/40 rounded-none border border-border p-2 shadow-sm md:p-3">
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                'relative flex flex-col rounded-none p-6 transition-all sm:p-8',
                plan.isPopular
                  ? 'bg-background border-border/50 border shadow-md'
                  : 'hover:bg-background/50 bg-transparent',
              )}
            >
              {plan.isPopular && (
                <div className="absolute top-6 right-6">
                  <Badge
                    variant="default"
                    className="rounded-none px-3 py-1 text-xs font-semibold shadow-[0px_0px_4px_1px_rgba(0,0,0,0.1),inset_0_0px_4px_1px_rgba(255,255,255,0.45),inset_0_0.5px_0px_0px_rgba(255,255,255,0.35)]"
                  >
                    Popular
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-foreground mb-3 text-2xl font-bold tracking-tight">
                  {plan.title}
                </h3>
                <p className="text-muted-foreground min-h-[40px] pr-8 text-sm sm:pr-12">
                  {plan.description}
                </p>
              </div>

              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-foreground text-5xl font-extrabold tracking-tight">
                  {plan.price}
                </span>
                {plan.priceSuffix && (
                  <span className="text-muted-foreground text-sm font-medium">
                    {plan.priceSuffix}
                  </span>
                )}
              </div>

              <div className="bg-border mb-8 h-[2px] w-1/3" />

              <ul className="mb-8 flex-1 space-y-4">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <MdCheckCircle className="text-foreground mt-0.5 h-5 w-5 shrink-0" />
                    <span className="text-muted-foreground text-sm font-medium">
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-4">
                {plan.isPopular ? (
                  <Button
                    size="lg"
                    type="button"
                    onClick={() => onSelectPlan?.(plan.id)}
                    className="group border-primary flex min-h-14 h-auto w-full items-center justify-between gap-2 rounded-none border px-4 sm:px-6 py-3 font-semibold shadow-[0px_0px_4px_1px_rgba(0,0,0,0.1),inset_0_0px_4px_1px_rgba(255,255,255,0.45),inset_0_1px_0px_0px_rgba(255,255,255,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/85 hover:shadow-lg active:translate-y-0 cursor-pointer"
                  >
                    <span className="text-sm sm:text-base transition-transform duration-200 group-hover:translate-x-0.5">
                      Get started for
                    </span>
                    <div className="bg-primary-foreground/50 group-hover:bg-primary-foreground/85 mx-2 sm:mx-4 h-[1px] flex-1 min-w-4 transition-colors duration-200" />
                    <span className="text-sm sm:text-base font-bold transition-transform duration-200 group-hover:-translate-x-0.5">
                      {plan.buttonText}
                    </span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => onSelectPlan?.(plan.id)}
                    className="group flex min-h-14 h-auto w-full cursor-pointer items-center justify-between gap-2 rounded-none border border-border/80 bg-transparent px-4 sm:px-5 py-3 outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/8 hover:text-primary dark:hover:bg-primary/12 active:translate-y-0"
                  >
                    <span className="text-foreground group-hover:text-primary text-sm sm:text-base font-medium transition-all duration-200 group-hover:translate-x-0.5">
                      Get started for
                    </span>
                    <div className="bg-border group-hover:bg-primary/45 mx-2 sm:mx-4 h-[2px] flex-1 min-w-4 transition-colors duration-200" />
                    <span className="text-foreground group-hover:text-primary text-sm sm:text-base font-bold transition-all duration-200 group-hover:-translate-x-0.5">
                      {plan.buttonText}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Pricing1;
