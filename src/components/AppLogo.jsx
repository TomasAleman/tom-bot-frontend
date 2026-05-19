import clsx from 'clsx';

const ICON_SRC = `${import.meta.env.BASE_URL}icons/icon.svg`;

/** Logo de la app (calendario + check). Usar en login, sidebar, etc. */
export default function AppLogo({ className, size = 40, ...props }) {
  return (
    <img
      src={ICON_SRC}
      alt=""
      width={size}
      height={size}
      className={clsx('rounded-xl object-cover', className)}
      {...props}
    />
  );
}
