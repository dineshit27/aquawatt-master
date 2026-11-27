"use client";

import * as React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { ArrowRight, CheckCircle2, Code2, HelpCircle, Mail } from "lucide-react";
import { Button } from "./button";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as d3 from "d3";
import { feature } from "topojson-client";
import type {
  Topology,
  GeometryCollection,
  GeometryObject,
} from "topojson-specification";
import type { GeoPermissibleObjects } from "d3";
import type { ContactFormState } from "../../services/supportService";

const smoothEase = [0.25, 0.1, 0.25, 1] as const;

export interface ContactLinkItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  external?: boolean;
}

const DEFAULT_CONTACT_LINKS: ContactLinkItem[] = [
  {
    icon: Mail,
    label: "aquawatt.sol@gmail.com",
    href: "mailto:aquawatt.sol@gmail.com",
  },
  {
    icon: Code2,
    label: "github.com/dineshit27/aquawatt-master",
    href: "https://github.com/dineshit27/aquawatt-master",
    external: true,
  },
  {
    icon: HelpCircle,
    label: "Hardware & Sensor FAQs",
    href: "#contact-faq",
  },
];

interface GlobeWireframeProps {
  width?: number;
  height?: number;
  className?: string;
  strokeColor?: string;
  strokeWidth?: number;
  graticuleColor?: string;
  graticuleOpacity?: number;
  sphereOutlineColor?: string;
  sphereOutlineWidth?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  rotateToLocation?: string | [number, number];
  rotateCities?: string[];
  rotationSpeed?: number;
  initialRotation?: [number, number];
  enableInteraction?: boolean;
  showGraticule?: boolean;
  startAsGlobe?: boolean;
  countryFillColor?: string;
  countryHoverColor?: string;
  variant?: "wireframe" | "wireframesolid" | "solid";
  scale?: number;
  backgroundColor?: string;
}

interface GeoFeature {
  type: string;
  geometry: GeometryObject;
  properties: Record<string, unknown> | null;
}

interface WorldAtlasTopology extends Topology {
  objects: {
    countries: GeometryCollection;
  };
}

interface CustomProjection extends d3.GeoProjection {
  alpha(value: number): CustomProjection;
  alpha(): number;
}

const cityCoordinates: Record<string, [number, number]> = {
  "san francisco": [37.7749, -122.4194],
  "new york": [40.7128, -74.006],
  london: [51.5074, -0.1278],
  tokyo: [35.6762, 139.6503],
  paris: [48.8566, 2.3522],
  moscow: [55.7558, 37.6176],
  dubai: [25.2048, 55.2708],
  singapore: [1.3521, 103.8198],
  sydney: [-33.8688, 151.2093],
  mumbai: [19.076, 72.8777],
  bengaluru: [12.9716, 77.5946],
  "los angeles": [34.0522, -118.2437],
  chicago: [41.8781, -87.6298],
};

function orthographicRaw(x: number, y: number): [number, number] {
  const cosy = Math.cos(y);
  return [cosy * Math.sin(x), Math.sin(y)];
}

function equirectangularRaw(lambda: number, phi: number): [number, number] {
  return [lambda, phi];
}

function interpolateProjection(
  raw0: (lambda: number, phi: number) => [number, number],
  raw1: (lambda: number, phi: number) => [number, number],
): CustomProjection {
  let t = 0;

  const createRawProjection = (
    alpha: number,
  ): ((lambda: number, phi: number) => [number, number]) => {
    return (lambda: number, phi: number): [number, number] => {
      const [x0, y0] = raw0(lambda, phi);
      const [x1, y1] = raw1(lambda, phi);
      return [x0 + alpha * (x1 - x0), y0 + alpha * (y1 - y0)];
    };
  };

  const projection = d3.geoProjection(
    createRawProjection(t),
  ) as unknown as CustomProjection;

  const alphaMethod = ((value?: number): CustomProjection | number => {
    if (value !== undefined) {
      t = +value;
      const newProjection = d3.geoProjection(
        createRawProjection(t),
      ) as unknown as CustomProjection;

      if (projection.scale()) newProjection.scale(projection.scale());
      if (projection.translate())
        newProjection.translate(projection.translate());
      if (projection.rotate()) newProjection.rotate(projection.rotate());
      if (projection.precision())
        newProjection.precision(projection.precision());

      newProjection.alpha = alphaMethod as CustomProjection["alpha"];

      return newProjection;
    }
    return t;
  }) as CustomProjection["alpha"];

  projection.alpha = alphaMethod;

  return projection;
}

export function GlobeWireframe({
  width,
  height,
  className = "aspect-square w-full max-w-150",
  strokeColor = "currentColor",
  strokeWidth = 1.0,
  graticuleColor = "currentColor",
  graticuleOpacity = 0.2,
  sphereOutlineColor = "currentColor",
  sphereOutlineWidth = 1,
  autoRotate = true,
  autoRotateSpeed = 0.5,
  rotateToLocation,
  rotateCities = [],
  rotationSpeed = 3000,
  initialRotation = [-77.59, -12.97],
  enableInteraction = true,
  showGraticule = true,
  startAsGlobe = true,
  countryFillColor,
  countryHoverColor,
  variant = "wireframe",
  scale = 1,
  backgroundColor,
}: GlobeWireframeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress] = useState(startAsGlobe ? 0 : 100);
  const [worldData, setWorldData] = useState<GeoFeature[]>([]);
  const [rotation, setRotation] = useState<[number, number]>(initialRotation);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState([0, 0]);
  const [isVisible, setIsVisible] = useState(false);
  const rotationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotationAnimFrame = useRef<number | null>(null);
  const rotationStartTime = useRef<number | null>(null);
  const rotationFrom = useRef<[number, number]>([0, 0]);
  const rotationTo = useRef<[number, number]>([0, 0]);
  const animationFrame = useRef<number | null>(null);
  const [currentCityIndex, setCurrentCityIndex] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const resizeObserver = useRef<ResizeObserver | null>(null);
  const rotationRef = useRef(rotation);

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  const useResponsive = !width && !height;
  const finalWidth = useResponsive ? dimensions.width : width || 800;
  const finalHeight = useResponsive ? dimensions.height : height || 500;

  const defaultStrokeColor = strokeColor || "currentColor";
  const defaultGraticuleColor = graticuleColor || "currentColor";
  const defaultSphereOutlineColor = sphereOutlineColor || "currentColor";
  const defaultCountryFillColor =
    countryFillColor || (variant === "solid" ? "currentColor" : "none");
  const defaultBackgroundColor = backgroundColor || "transparent";

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const updateDimensions = () => {
      if (container && useResponsive) {
        const nextWidth = container.offsetWidth || 300;
        setDimensions({ width: nextWidth, height: nextWidth });
      }
    };

    updateDimensions();

    if (useResponsive && typeof ResizeObserver !== "undefined") {
      resizeObserver.current = new ResizeObserver(updateDimensions);
      resizeObserver.current.observe(container);
    }

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          setIsVisible(entry.isIntersecting);
        },
        { threshold: 0.1 },
      );
      observer.observe(container);
    } else {
      setIsVisible(true);
    }

    return () => {
      if (resizeObserver.current) {
        resizeObserver.current.disconnect();
      }
      if (observer) {
        observer.unobserve(container);
      }
    };
  }, [useResponsive]);

  useEffect(() => {
    let active = true;
    const loadWorldData = async () => {
      try {
        const response = await fetch(
          "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
        );
        const world = (await response.json()) as WorldAtlasTopology;
        const countries = feature(world, world.objects.countries)
          .features as unknown as GeoFeature[];
        if (active) setWorldData(countries);
      } catch {
        const fallbackData: GeoFeature[] = [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-180, -90],
                  [180, -90],
                  [180, 90],
                  [-180, 90],
                  [-180, -90],
                ],
              ],
            } as unknown as GeometryObject,
            properties: {},
          },
        ];
        if (active) setWorldData(fallbackData);
      }
    };
    loadWorldData();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!autoRotate || !isVisible || isDragging || rotateCities.length > 0) {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
      return;
    }

    const rotate = () => {
      setRotation((prev) => [(prev[0] + autoRotateSpeed) % 360, prev[1]]);
      animationFrame.current = requestAnimationFrame(rotate);
    };

    animationFrame.current = requestAnimationFrame(rotate);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [autoRotate, autoRotateSpeed, isVisible, isDragging, rotateCities.length]);

  const animateRotationTo = useCallback(
    (target: [number, number], duration = 1200) => {
      if (rotationAnimFrame.current) {
        cancelAnimationFrame(rotationAnimFrame.current);
      }

      rotationFrom.current = rotationRef.current;
      rotationTo.current = target;
      rotationStartTime.current = performance.now();

      const animate = (time: number) => {
        const elapsed = time - (rotationStartTime.current || 0);
        const t = Math.min(elapsed / duration, 1);

        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        const lon =
          rotationFrom.current[0] +
          (rotationTo.current[0] - rotationFrom.current[0]) * eased;

        const lat =
          rotationFrom.current[1] +
          (rotationTo.current[1] - rotationFrom.current[1]) * eased;

        setRotation([lon, lat]);

        if (t < 1) {
          rotationAnimFrame.current = requestAnimationFrame(animate);
        }
      };

      rotationAnimFrame.current = requestAnimationFrame(animate);
    },
    [],
  );

  useEffect(() => {
    if (rotateCities.length === 0 || !isVisible) return;

    const rotateToNextCity = () => {
      const nextIndex = (currentCityIndex + 1) % rotateCities.length;
      const city = rotateCities[nextIndex].toLowerCase();
      const coordinates = cityCoordinates[city];

      if (coordinates) {
        animateRotationTo(
          [-coordinates[1], -coordinates[0]],
          rotationSpeed * 0.6,
        );
        setCurrentCityIndex(nextIndex);
      }
    };

    const city = rotateCities[currentCityIndex].toLowerCase();
    const coordinates = cityCoordinates[city];

    if (coordinates) {
      animateRotationTo(
        [-coordinates[1], -coordinates[0]],
        rotationSpeed * 0.6,
      );
    }

    rotationInterval.current = setInterval(rotateToNextCity, rotationSpeed);

    return () => {
      if (rotationInterval.current) clearInterval(rotationInterval.current);
    };
  }, [
    rotateCities,
    currentCityIndex,
    rotationSpeed,
    isVisible,
    animateRotationTo,
  ]);

  useEffect(() => {
    if (!rotateToLocation) return;

    let coordinates: [number, number];
    if (typeof rotateToLocation === "string") {
      const city = rotateToLocation.toLowerCase();
      coordinates = cityCoordinates[city] || [0, 0];
    } else {
      coordinates = rotateToLocation;
    }

    setRotation([-coordinates[1], -coordinates[0]]);
  }, [rotateToLocation]);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (!enableInteraction) return;
    setIsDragging(true);
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setLastMouse([event.clientX - rect.left, event.clientY - rect.top]);
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging || !enableInteraction) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentMouse = [event.clientX - rect.left, event.clientY - rect.top];
    const dx = currentMouse[0] - lastMouse[0];
    const dy = currentMouse[1] - lastMouse[1];

    const t = progress / 100;
    let sensitivity: number;

    if (variant === "wireframe") {
      sensitivity = t < 0.5 ? 0.5 : 0.25;
    } else {
      sensitivity = 0.5;
    }

    setRotation((prev) => [
      prev[0] + dx * sensitivity,
      Math.max(-90, Math.min(90, prev[1] - dy * sensitivity)),
    ]);

    setLastMouse(currentMouse);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!svgRef.current || worldData.length === 0 || !isVisible) return;
    if (useResponsive && dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    let finalCountryFill = "none";
    let finalStrokeWidth = strokeWidth;
    let finalOpacity = 1.0;
    let renderGraticule = showGraticule;
    let finalGraticuleOpacity = graticuleOpacity;
    let finalSphereOutlineWidth = sphereOutlineWidth;

    if (variant === "wireframe") {
      finalCountryFill = "none";
      finalStrokeWidth = strokeWidth;
      finalOpacity = 1.0;
      renderGraticule = showGraticule;
      finalGraticuleOpacity = graticuleOpacity;
      finalSphereOutlineWidth = sphereOutlineWidth;
    } else if (variant === "wireframesolid") {
      finalCountryFill = "none";
      finalStrokeWidth = strokeWidth;
      finalOpacity = 1.0;
      renderGraticule = false;
      finalGraticuleOpacity = 0;
      finalSphereOutlineWidth = 1.5;
    } else if (variant === "solid") {
      finalCountryFill = defaultCountryFillColor;
      finalStrokeWidth = strokeWidth * 0.5;
      finalOpacity = 0.3;
      renderGraticule = false;
      finalGraticuleOpacity = 0;
      finalSphereOutlineWidth = 1.5;
    }

    if (defaultBackgroundColor !== "transparent") {
      const radius = (Math.min(finalWidth, finalHeight) / 2) * scale * 0.9;
      svg
        .append("circle")
        .attr("cx", finalWidth / 2)
        .attr("cy", finalHeight / 2)
        .attr("r", radius)
        .attr("fill", defaultBackgroundColor);
    }

    let projection: d3.GeoProjection | CustomProjection;
    const path = d3.geoPath();

    if (variant === "wireframe") {
      const t = progress / 100;
      const alpha = Math.pow(t, 0.5);

      const baseScale = Math.min(finalWidth, finalHeight) / 2;
      const scaleRange = d3
        .scaleLinear()
        .domain([0, 1])
        .range([baseScale * 0.9 * scale, baseScale * 0.54 * scale]);
      const baseRotate = d3.scaleLinear().domain([0, 1]).range([0, 0]);

      projection = interpolateProjection(orthographicRaw, equirectangularRaw)
        .scale(scaleRange(alpha))
        .translate([finalWidth / 2, finalHeight / 2])
        .rotate([baseRotate(alpha) + rotation[0], rotation[1]])
        .precision(0.1);

      (projection as CustomProjection).alpha(alpha);
      path.projection(projection);
    } else {
      projection = d3
        .geoOrthographic()
        .scale((Math.min(finalWidth, finalHeight) / 2) * scale * 0.9)
        .translate([finalWidth / 2, finalHeight / 2])
        .rotate([rotation[0], rotation[1]])
        .precision(0.1);

      path.projection(projection);
    }

    if (renderGraticule && finalGraticuleOpacity > 0) {
      try {
        const graticule = d3.geoGraticule();
        const graticulePath = path(graticule());
        if (graticulePath) {
          svg
            .append("path")
            .datum(graticule())
            .attr("d", graticulePath)
            .attr("fill", "none")
            .attr("stroke", defaultGraticuleColor)
            .attr("stroke-width", 1)
            .attr("opacity", finalGraticuleOpacity);
        }
      } catch {
        // Ignore graticule projection error on edge resize
      }
    }

    svg
      .selectAll(".country")
      .data(worldData)
      .enter()
      .append("path")
      .attr("class", "country")
      .attr("d", (d: GeoFeature) => {
        try {
          const pathString = path(d as unknown as GeoPermissibleObjects);
          if (!pathString) return "";
          if (
            typeof pathString === "string" &&
            (pathString.includes("NaN") || pathString.includes("Infinity"))
          ) {
            return "";
          }
          return pathString;
        } catch {
          return "";
        }
      })
      .attr("fill", finalCountryFill)
      .attr("stroke", defaultStrokeColor)
      .attr("stroke-width", finalStrokeWidth)
      .attr("opacity", finalOpacity)
      .style("visibility", function (this: SVGPathElement) {
        const pathData = d3.select(this).attr("d");
        return pathData && pathData.length > 0 && !pathData.includes("NaN")
          ? "visible"
          : "hidden";
      })
      .on("mouseenter", function (this: SVGPathElement) {
        if (countryHoverColor && variant === "solid") {
          d3.select(this).attr("fill", countryHoverColor);
        }
      })
      .on("mouseleave", function (this: SVGPathElement) {
        if (variant === "solid") {
          d3.select(this).attr("fill", finalCountryFill);
        }
      });

    try {
      const sphereOutline = path({ type: "Sphere" });
      if (sphereOutline) {
        svg
          .append("path")
          .datum({ type: "Sphere" })
          .attr("d", sphereOutline)
          .attr("fill", "none")
          .attr("stroke", defaultSphereOutlineColor)
          .attr("stroke-width", finalSphereOutlineWidth)
          .attr("opacity", variant === "wireframe" ? 1.0 : 0.8);
      }
    } catch {
      // Ignore sphere outline error on zero-size container
    }
  }, [
    worldData,
    progress,
    rotation,
    isVisible,
    finalWidth,
    finalHeight,
    defaultStrokeColor,
    strokeWidth,
    defaultGraticuleColor,
    graticuleOpacity,
    defaultSphereOutlineColor,
    sphereOutlineWidth,
    showGraticule,
    defaultCountryFillColor,
    countryHoverColor,
    variant,
    scale,
    defaultBackgroundColor,
    useResponsive,
    dimensions.width,
  ]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <svg
        ref={svgRef}
        aria-label="Interactive 3D wireframe globe"
        width={finalWidth}
        height={finalHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={
          useResponsive
            ? "w-full h-full opacity-0 transition-opacity duration-1000"
            : ""
        }
        style={{
          cursor: enableInteraction
            ? isDragging
              ? "grabbing"
              : "grab"
            : "default",
          opacity: useResponsive ? (dimensions.width > 0 ? 1 : 0) : 1,
        }}
      />
    </div>
  );
}

export const FormDots = React.forwardRef<
  React.ComponentRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref,
  ) => {
    const isHorizontal = orientation === "horizontal";
    return (
      <SeparatorPrimitive.Root
        ref={ref}
        decorative={decorative}
        orientation={orientation}
        className={cn(
          "shrink-0 flex items-center justify-center overflow-hidden",
          isHorizontal ? "w-full" : "h-full",
          className,
        )}
        {...props}
      >
        <div
          className={cn("relative", isHorizontal ? "w-full h-4" : "h-full w-4")}
        >
          <div
            className={cn(
              "absolute inset-0 bg-repeat",
              "text-neutral-400 dark:text-white/20",
            )}
            style={{
              backgroundImage:
                "radial-gradient(circle, currentColor 0.8px, transparent 0.8px)",
              backgroundSize: isHorizontal ? "6px 100%" : "100% 6px",
              maskImage: isHorizontal
                ? "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)"
                : "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
            }}
          />
        </div>
      </SeparatorPrimitive.Root>
    );
  },
);
FormDots.displayName = "FormDots";

export interface ContactWithGlobeProps {
  id?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  className?: string;
  contactLinks?: ContactLinkItem[];
  form?: ContactFormState;
  onFormChange?: (next: ContactFormState) => void;
  errors?: Partial<Record<keyof ContactFormState, string>>;
  isSubmitting?: boolean;
  submittedMessage?: string | null;
  onResetSubmitted?: () => void;
  onSubmit?: (e: React.FormEvent) => void;
}

export default function ContactWithGlobe({
  id,
  title = "Send an Inquiry or Incident Report",
  subtitle = "Contact",
  description = "Reach out about FS-S401 pulse flow wiring, ESP32 serial diagnostics, Supabase schema configuration, or AquaWatt Business deployments.",
  className,
  contactLinks = DEFAULT_CONTACT_LINKS,
  form: controlledForm,
  onFormChange,
  errors = {},
  isSubmitting = false,
  submittedMessage = null,
  onResetSubmitted,
  onSubmit,
}: ContactWithGlobeProps) {
  const [internalForm, setInternalForm] = useState<ContactFormState>({
    fullName: "",
    email: "",
    category: "Hardware & Sensor Setup",
    subject: "",
    message: "",
  });

  const form = controlledForm ?? internalForm;
  const updateForm = (patch: Partial<ContactFormState>) => {
    const next = { ...form, ...patch };
    if (onFormChange) {
      onFormChange(next);
    } else {
      setInternalForm(next);
    }
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id={id}
      className={cn(
        "relative w-full bg-zinc-50 dark:bg-zinc-950/90 overflow-hidden py-16 sm:py-20 scroll-mt-6",
        className,
      )}
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center gap-4 mb-12">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: smoothEase }}
            className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#174A8B]/10 dark:bg-sky-500/10 border border-[#174A8B]/25 dark:border-sky-400/30"
          >
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#174A8B] dark:text-sky-400">
              {subtitle}
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.15, ease: smoothEase }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold font-heading text-zinc-900 dark:text-white tracking-tight"
          >
            {title}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.3, ease: smoothEase }}
            className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-xl"
          >
            {description}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl mx-auto items-start">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.0, delay: 0.2, ease: smoothEase }}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-semibold font-heading text-zinc-900 dark:text-white">
                Get in touch
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs">
                Reach out via email, inspect the open repository, or jump directly to diagnostic FAQs.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {contactLinks.map(({ icon: Icon, label, href, external }, i) => (
                <motion.a
                  key={label}
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  onClick={(e) => handleLinkClick(e, href)}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: 0.3 + i * 0.1,
                    ease: smoothEase,
                  }}
                  className="group flex items-center gap-3 w-fit text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 group-hover:border-[#174A8B]/40 dark:group-hover:border-sky-400/40 group-hover:bg-[#174A8B]/10 dark:group-hover:bg-sky-500/10 flex items-center justify-center shrink-0 transition-all duration-200">
                    <Icon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-[#174A8B] dark:group-hover:text-sky-400 transition-colors duration-200" />
                  </div>
                  {label}
                </motion.a>
              ))}
            </div>

            <div className="relative overflow-hidden h-56 sm:h-64 text-zinc-700 dark:text-zinc-300">
              <GlobeWireframe
                className="w-full aspect-square max-w-full absolute top-0 left-0"
                variant="wireframesolid"
                autoRotate
                autoRotateSpeed={0.45}
                strokeWidth={0.6}
                graticuleOpacity={0.12}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-zinc-50 dark:from-zinc-950 to-transparent" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.0, delay: 0.35, ease: smoothEase }}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 flex flex-col gap-5 shadow-xs"
          >
            <div>
              <h3 className="text-lg font-semibold font-heading text-zinc-900 dark:text-white mb-0.5">
                Send a message
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Validates your inquiry and generates a local reference ticket in the browser.
              </p>
            </div>

            <FormDots />

            {submittedMessage ? (
              <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#237A57] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-emerald-900 dark:text-emerald-200">
                      Inquiry Dispatched (Local Simulation)
                    </h4>
                    <p className="text-emerald-700 dark:text-emerald-300 mt-1 leading-relaxed">
                      {submittedMessage}
                    </p>
                    <button
                      type="button"
                      onClick={onResetSubmitted}
                      className="mt-4 px-3.5 py-2 rounded-lg bg-[#237A57] text-white font-semibold cursor-pointer"
                    >
                      Submit Another Inquiry
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="contact-fullName"
                      className="text-xs font-semibold tracking-widest uppercase text-zinc-500 dark:text-zinc-400"
                    >
                      Full Name *
                    </label>
                    <input
                      id="contact-fullName"
                      type="text"
                      placeholder="e.g. Aarav Nair"
                      aria-invalid={Boolean(errors.fullName)}
                      aria-describedby={errors.fullName ? "contact-fullName-err" : undefined}
                      value={form.fullName}
                      onChange={(e) => updateForm({ fullName: e.target.value })}
                      className={cn(
                        "w-full bg-zinc-50 dark:bg-zinc-800/60 border rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-[#174A8B] dark:focus:border-sky-500/60 focus:ring-2 focus:ring-[#174A8B]/15 transition-all duration-200",
                        errors.fullName ? "border-rose-400" : "border-zinc-200 dark:border-zinc-700",
                      )}
                    />
                    {errors.fullName && (
                      <span id="contact-fullName-err" role="alert" className="text-rose-500 text-[11px]">
                        {errors.fullName}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="contact-email"
                      className="text-xs font-semibold tracking-widest uppercase text-zinc-500 dark:text-zinc-400"
                    >
                      Work Email *
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      placeholder="name@facility.org"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "contact-email-err" : undefined}
                      value={form.email}
                      onChange={(e) => updateForm({ email: e.target.value })}
                      className={cn(
                        "w-full bg-zinc-50 dark:bg-zinc-800/60 border rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-[#174A8B] dark:focus:border-sky-500/60 focus:ring-2 focus:ring-[#174A8B]/15 transition-all duration-200",
                        errors.email ? "border-rose-400" : "border-zinc-200 dark:border-zinc-700",
                      )}
                    />
                    {errors.email && (
                      <span id="contact-email-err" role="alert" className="text-rose-500 text-[11px]">
                        {errors.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="contact-category"
                      className="text-xs font-semibold tracking-widest uppercase text-zinc-500 dark:text-zinc-400"
                    >
                      Category
                    </label>
                    <select
                      id="contact-category"
                      value={form.category}
                      onChange={(e) => updateForm({ category: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 outline-none focus:border-[#174A8B] dark:focus:border-sky-500/60 focus:ring-2 focus:ring-[#174A8B]/15 transition-all duration-200"
                    >
                      <option value="Hardware & Sensor Setup">Hardware &amp; ESP32 Setup</option>
                      <option value="Anomaly Detection Tuning">Leak &amp; Threshold Calibration</option>
                      <option value="ESG Reporting Compliance">Sustainability Reporting</option>
                      <option value="Enterprise Integration">API / Integration Inquiries</option>
                      <option value="Billing & Plans">Subscription &amp; Plans</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="contact-subject"
                      className="text-xs font-semibold tracking-widest uppercase text-zinc-500 dark:text-zinc-400"
                    >
                      Subject *
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      placeholder="Brief summary of inquiry"
                      aria-invalid={Boolean(errors.subject)}
                      aria-describedby={errors.subject ? "contact-subject-err" : undefined}
                      value={form.subject}
                      onChange={(e) => updateForm({ subject: e.target.value })}
                      className={cn(
                        "w-full bg-zinc-50 dark:bg-zinc-800/60 border rounded-xl px-4 py-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-[#174A8B] dark:focus:border-sky-500/60 focus:ring-2 focus:ring-[#174A8B]/15 transition-all duration-200",
                        errors.subject ? "border-rose-400" : "border-zinc-200 dark:border-zinc-700",
                      )}
                    />
                    {errors.subject && (
                      <span id="contact-subject-err" role="alert" className="text-rose-500 text-[11px]">
                        {errors.subject}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="contact-message"
                    className="text-xs font-semibold tracking-widest uppercase text-zinc-500 dark:text-zinc-400"
                  >
                    Message *
                  </label>
                  <textarea
                    id="contact-message"
                    rows={4}
                    placeholder="Provide details regarding sensor readings, GPIO34 setup, or deployment requirements..."
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={errors.message ? "contact-message-err" : undefined}
                    value={form.message}
                    onChange={(e) => updateForm({ message: e.target.value })}
                    className={cn(
                      "w-full bg-zinc-50 dark:bg-zinc-800/60 border rounded-xl px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-[#174A8B] dark:focus:border-sky-500/60 focus:ring-2 focus:ring-[#174A8B]/15 resize-none transition-all duration-200",
                      errors.message ? "border-rose-400" : "border-zinc-200 dark:border-zinc-700",
                    )}
                  />
                  {errors.message && (
                    <span id="contact-message-err" role="alert" className="text-rose-500 text-[11px]">
                      {errors.message}
                    </span>
                  )}
                </div>

                <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    * Required fields • Local simulated dispatch
                  </span>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-fit h-11 px-8 rounded-xl font-semibold text-sm bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 group"
                  >
                    <span>{isSubmitting ? "Transmitting..." : "Submit"}</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
