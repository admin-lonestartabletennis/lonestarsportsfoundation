document.documentElement.classList.add("has-mobile-nav");

const navigation = document.querySelectorAll(".site-nav");

navigation.forEach((nav, index) => {
  const navigationId = nav.id || `primary-navigation-${index + 1}`;
  nav.id = navigationId;

  const toggle = document.createElement("button");
  toggle.className = "menu-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-controls", navigationId);
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = '<span>Menu</span><span class="menu-toggle-icon" aria-hidden="true"></span>';
  nav.before(toggle);

  const setOpen = (isOpen) => {
    nav.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  };

  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
});
