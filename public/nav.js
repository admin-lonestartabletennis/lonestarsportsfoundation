document.documentElement.classList.add("has-mobile-nav");

const navigation = document.querySelectorAll(".site-nav");

navigation.forEach((nav, index) => {
  const navigationId = nav.id || `primary-navigation-${index + 1}`;
  nav.id = navigationId;

  const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
  const links = [...nav.querySelectorAll("a")];
  const currentLink = links
    .filter((link) => {
      const linkPath = new URL(link.href).pathname.replace(/\/+$/, "") || "/";
      return currentPath === linkPath || (linkPath !== "/" && currentPath.startsWith(`${linkPath}/`));
    })
    .sort((first, second) => second.href.length - first.href.length)[0];
  const currentPage = currentLink?.textContent.trim() || "Home";
  currentLink?.setAttribute("aria-current", "page");

  const toggle = document.createElement("button");
  toggle.className = "menu-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-controls", navigationId);
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open site navigation");
  toggle.innerHTML = `<span class="menu-current-page">${currentPage}</span><span class="menu-toggle-icon" aria-hidden="true"></span>`;
  nav.before(toggle);

  const setOpen = (isOpen) => {
    nav.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close site navigation" : "Open site navigation");
  };

  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
});
