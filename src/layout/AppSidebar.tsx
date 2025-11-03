"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { UserData, useStore } from "@/store/useStore";
import {
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  NotificationLineIcon,
  PageIcon,
  UserCircleIcon,
  BoxIcon,
  CarLineIcon,
} from "../icons/index";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  allowedRoles?: string[];
  specialAccess?: string; // Para acceso especial a ciertos usuarios
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean; allowedRoles?: string[]; }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/",
    allowedRoles: ['MECHANIC', 'SUPER_ADMIN'],
  },
  {
    name: "Usuarios",
    icon: <UserCircleIcon />,
    allowedRoles: ['MECHANIC', 'SUPER_ADMIN'],
    subItems: [
      { name: "Usuarios", path: "/users", allowedRoles: ['SUPER_ADMIN',] },
      { name: "Mecanicos", path: "/mechanics", allowedRoles: ['SUPER_ADMIN'] },
      { name: "Clientes", path: "/customers", allowedRoles: ['MECHANIC', 'SUPER_ADMIN'] },
    ]
  },

  {
    name: "Repuestos",
    icon: <BoxIcon className="w-6 h-6" />,
    allowedRoles: ['MECHANIC', 'SUPER_ADMIN'],
    subItems: [
      { name: "Repuestos", path: "/spare", allowedRoles: ['MECHANIC', 'SUPER_ADMIN'] },
    ]
  },
  {
    name: "Servicios",
    icon: <CarLineIcon className="w-6 h-6" />,
    allowedRoles: ['MECHANIC', 'SUPER_ADMIN'],
    subItems: [
      { name: "Servicios", path: "/services", allowedRoles: ['MECHANIC', 'SUPER_ADMIN'] },
      { name: "ARCA", path: "/arca", allowedRoles: ['SUPER_ADMIN'] },
    ]
  },
  {
    name: "Reportes",
    icon: <PageIcon className="w-6 h-6" />,
    allowedRoles: ['ADMINISTRATOR', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'FINANCE'],
    subItems: [
      { name: "Reporte de Ventas", path: "/reports/sales", allowedRoles: ['ADMINISTRATOR', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'FINANCE', 'CASHIER', 'SALESMAN'] },
      { name: "Reporte de Inventario", path: "/reports/inventory", allowedRoles: ['ADMINISTRATOR', 'SUPER_ADMIN', 'INVENTORY_MANAGER', 'BRANCH_MANAGER', 'CASHIER', 'SALESMAN', 'FINANCE'] },
      { name: "Movimientos de Stock", path: "/stock-movements", allowedRoles: ['ADMINISTRATOR', 'SUPER_ADMIN', 'INVENTORY_MANAGER', 'BRANCH_MANAGER', 'CASHIER', 'SALESMAN', 'FINANCE'] },
    ]
  },
  {
    name: "Notificaciones",
    icon: <NotificationLineIcon className="w-6 h-6" />,
    path: "/notifications",
    allowedRoles: ['SUPER_ADMIN']
  }
];

const othersItems: NavItem[] = [
  // Vacio de momento (vere que se hace con esta mas adelante)
];

const AppSidebar: React.FC = () => {
  // Obtener el usuario actual y su rol del store global
  const user = useStore(state => state.user);
  const userRole = user?.role || '';
  const isSuperUser = (user as UserData)?.is_superuser || false;

  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  // Función para verificar si un elemento debe mostrarse según el rol del usuario
  const shouldShowItem = useCallback((item: NavItem | { allowedRoles?: string[], specialAccess?: string }) => {
    // Para items con acceso especial por correo electrónico
    if ('specialAccess' in item && item.specialAccess) {
      // Verificar si el correo electrónico del usuario coincide exactamente con el especificado
      return user?.email === item.specialAccess;
      // Eliminamos la verificación de superusuario para mantener el acceso estrictamente por email
    }

    // Si no tiene roles definidos, todos pueden verlo
    if (!item.allowedRoles) return true;

    // Si el usuario tiene is_superuser=true, permitirle ver todos los elementos de SUPER_ADMIN
    if (isSuperUser && item.allowedRoles.includes('SUPER_ADMIN')) {
      return true;
    }

    // Si tiene roles definidos, verificar si el usuario actual tiene permiso
    return item.allowedRoles.includes(userRole);
  }, [isSuperUser, userRole, user?.email]);

  // Función para verificar si un menú principal tiene al menos un subitem visible
  const hasVisibleSubItems = (nav: NavItem) => {
    if (!nav.subItems) return false;
    return nav.subItems.some(subItem => shouldShowItem(subItem));
  };

  const renderMenuItems = (
    navItems: NavItem[],
    menuType: "main" | "others"
  ) => (
    <ul className="flex flex-col gap-4">
      {/* Filtrar los elementos que no debe ver este usuario */}
      {navItems
        .filter(nav => shouldShowItem(nav) && (!nav.subItems || hasVisibleSubItems(nav)))
        .map((nav, index) => (
          <li key={nav.name}>
            {nav.subItems ? (
              <button
                onClick={() => handleSubmenuToggle(index, menuType)}
                className={`menu-item group ${openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-active"
                    : "menu-item-inactive"
                  } cursor-pointer ${!isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "lg:justify-start"
                  }`}
              >
                <span
                  className={`${openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                    }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
                {(isExpanded || isHovered || isMobileOpen) && (
                  <ChevronDownIcon
                    className={`ml-auto w-5 h-5 transition-transform duration-200 ${openSubmenu?.type === menuType &&
                        openSubmenu?.index === index
                        ? "rotate-180 text-brand-500"
                        : ""
                      }`}
                  />
                )}
              </button>
            ) : (
              nav.path && (
                <Link
                  href={nav.path}
                  className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                    }`}
                >
                  <span
                    className={`${isActive(nav.path)
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                      }`}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className={`menu-item-text`}>{nav.name}</span>
                  )}
                </Link>
              )
            )}
            {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
              <div
                ref={(el) => {
                  subMenuRefs.current[`${menuType}-${index}`] = el;
                }}
                className="overflow-hidden transition-all duration-300"
                style={{
                  height:
                    openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? `${subMenuHeight[`${menuType}-${index}`]}px`
                      : "0px",
                }}
              >
                <ul className="mt-2 space-y-1 ml-9">
                  {/* Filtrar los subelementos por rol */}
                  {nav.subItems
                    .filter(subItem => shouldShowItem(subItem))
                    .map((subItem) => (
                      <li key={subItem.name}>
                        <Link
                          href={subItem.path}
                          className={`menu-dropdown-item ${isActive(subItem.path)
                              ? "menu-dropdown-item-active"
                              : "menu-dropdown-item-inactive"
                            }`}
                        >
                          {subItem.name}
                          <span className="flex items-center gap-1 ml-auto">
                            {subItem.new && (
                              <span
                                className={`ml-auto ${isActive(subItem.path)
                                    ? "menu-dropdown-badge-active"
                                    : "menu-dropdown-badge-inactive"
                                  } menu-dropdown-badge `}
                              >
                                new
                              </span>
                            )}
                            {subItem.pro && (
                              <span
                                className={`ml-auto ${isActive(subItem.path)
                                    ? "menu-dropdown-badge-active"
                                    : "menu-dropdown-badge-inactive"
                                  } menu-dropdown-badge `}
                              >
                                pro
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </li>
        ))}
    </ul>
  );

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    // Check if the current path matches any submenu item
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        // Solo revisar elementos visibles para este usuario
        if (shouldShowItem(nav) && nav.subItems) {
          const visibleSubItems = nav.subItems.filter(subItem => shouldShowItem(subItem));
          visibleSubItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    // If no submenu item matches, close the open submenu
    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive, userRole, shouldShowItem]);

  useEffect(() => {
    // Set the height of the submenu items when the submenu is opened
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  // Modificar handleSubmenuToggle para manejar índices filtrados
  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    // Obtener los elementos visibles para este tipo de menú
    const visibleItems = (menuType === "main" ? navItems : othersItems)
      .filter(nav => shouldShowItem(nav) && (!nav.subItems || hasVisibleSubItems(nav)));

    // Obtener el elemento en el índice dado
    const targetItem = visibleItems[index];

    // Encontrar el índice original en el array completo
    const originalItems = menuType === "main" ? navItems : othersItems;
    const originalIndex = originalItems.findIndex(item => item.name === targetItem.name);

    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === originalIndex
      ) {
        return null;
      }
      return { type: menuType, index: originalIndex };
    });
  };

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo-mecanica.svg"
                alt="Mecanica Logo"
                width={150}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-mecanica-dark.svg"
                alt="Mecanica Logo"
                width={150}
                height={40}
              />
            </>
          ) : (
            <>
              <Image
                className="block dark:hidden"
                src="/images/logo/logo-mecanica.svg"
                alt="Mecanica Logo"
                width={50}
                height={50}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-mecanica-dark.svg"
                alt="Mecanica Logo"
                width={50}
                height={50}
              />
            </>
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>

            <div className="">
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${!isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                  }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Others"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              {renderMenuItems(othersItems, "others")}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;