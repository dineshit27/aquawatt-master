"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
  type UseScrollOptions,
} from "framer-motion";

export interface ContainerScrollProps {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
  perspectiveClassName?: string;
  headerClassName?: string;
  cardClassName?: string;
  cardInnerClassName?: string;
  scrollOffset?: UseScrollOptions["offset"];
  rotateRange?: [number, number];
  translateRange?: [number, number];
  mobileScaleRange?: [number, number];
  desktopScaleRange?: [number, number];
  cardTransformOrigin?: string;
  cardTopSlot?: React.ReactNode;
}

export const ContainerScroll = ({
  titleComponent,
  children,
  className = "h-[60rem] md:h-[80rem] flex items-center justify-center relative p-2 md:p-20",
  perspectiveClassName = "py-10 md:py-40 w-full relative",
  headerClassName,
  cardClassName,
  cardInnerClassName,
  scrollOffset,
  rotateRange = [20, 0],
  translateRange = [0, -100],
  mobileScaleRange = [0.7, 0.9],
  desktopScaleRange = [1.05, 1],
  cardTransformOrigin,
  cardTopSlot,
}: ContainerScrollProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    ...(scrollOffset ? { offset: scrollOffset } : {}),
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const scaleRange = isMobile ? mobileScaleRange : desktopScaleRange;

  const rotate = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? [0, 0] : rotateRange
  );
  const scale = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? [1, 1] : scaleRange
  );
  const translate = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? [0, 0] : translateRange
  );

  return (
    <div className={className} ref={containerRef}>
      <div
        className={perspectiveClassName}
        style={{
          perspective: "1000px",
        }}
      >
        <Header
          translate={translate}
          titleComponent={titleComponent}
          className={headerClassName}
        />
        <Card
          rotate={rotate}
          translate={translate}
          scale={scale}
          className={cardClassName}
          innerClassName={cardInnerClassName}
          transformOrigin={cardTransformOrigin}
          topSlot={cardTopSlot}
        >
          {children}
        </Card>
      </div>
    </div>
  );
};

export interface ContainerScrollHeaderProps {
  translate: MotionValue<number>;
  titleComponent: string | React.ReactNode;
  className?: string;
}

export const Header = ({
  translate,
  titleComponent,
  className = "div max-w-5xl mx-auto text-center",
}: ContainerScrollHeaderProps) => {
  return (
    <motion.div
      style={{
        translateY: translate,
      }}
      className={className}
    >
      {titleComponent}
    </motion.div>
  );
};

export interface ContainerScrollCardProps {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate?: MotionValue<number>;
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  transformOrigin?: string;
  topSlot?: React.ReactNode;
}

export const Card = ({
  rotate,
  scale,
  children,
  className = "max-w-5xl -mt-12 mx-auto h-[30rem] md:h-[40rem] w-full border-4 border-[#6C6C6C] p-2 md:p-6 bg-[#222222] rounded-[30px] shadow-2xl",
  innerClassName = "h-full w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-zinc-900 md:rounded-2xl md:p-4",
  transformOrigin = "center center",
  topSlot,
}: ContainerScrollCardProps) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        transformOrigin,
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      }}
      className={className}
    >
      {topSlot}
      <div className={innerClassName}>{children}</div>
    </motion.div>
  );
};

export default ContainerScroll;
