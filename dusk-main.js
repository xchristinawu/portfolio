/* Pared-back interactions: nav solidifies past the hero. (Reveals removed — content is visible by default; the hero carries the motion.) */
(function () {
  const nav = document.querySelector(".site-nav");
  const hero = document.getElementById("hero");
  if (nav && hero) {
    new IntersectionObserver((e) => {
      nav.classList.toggle("solid", !e[0].isIntersecting);
    }, { threshold: 0, rootMargin: "-72px 0px 0px 0px" }).observe(hero);
  }
})();
