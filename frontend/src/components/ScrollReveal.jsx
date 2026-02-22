import useScrollReveal from "../hooks/useScrollReveal.js";

export default function ScrollReveal({ children, delay = 0, className = "", deferRender = false }) {
  const [ref, isVisible] = useScrollReveal();

  return (
    <div
      ref={ref}
      className={`scroll-reveal ${isVisible ? "scroll-reveal--visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {deferRender && !isVisible ? null : children}
    </div>
  );
}
