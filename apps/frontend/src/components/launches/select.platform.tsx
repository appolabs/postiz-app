'use client';

import { uniqBy } from 'lodash';
import React, { FC, useCallback, useMemo, useState } from 'react';
import { Integrations } from '@gitroom/frontend/components/launches/calendar.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import clsx from 'clsx';
import { useClickOutside } from '@mantine/hooks';
import { DropdownArrowIcon } from '@gitroom/frontend/components/ui/icons';

const FilterIcon: FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export const SelectPlatform: FC<{
  onChange: (value: string) => void;
  integrations: Integrations[];
  platform?: string;
}> = (props) => {
  const { onChange, integrations, platform: currentPlatform } = props;
  const t = useT();
  const [platform, setPlatform] = useState(currentPlatform || '');
  const [pos, setPos] = useState<any>({});
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => {
    if (open) {
      setOpen(false);
    }
  });

  const openClose = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }

    const { x, y, width, height } = ref.current?.getBoundingClientRect();
    setPos({ top: y + height, left: x });
    setOpen(true);
  }, [open]);

  const uniquePlatforms = useMemo(() => {
    return uniqBy(integrations, (i) => i.identifier);
  }, [integrations]);

  const activePlatform = useMemo(() => {
    return uniquePlatforms.find((p) => p.identifier === platform);
  }, [uniquePlatforms, platform]);

  if (uniquePlatforms.length <= 1) {
    return null;
  }

  return (
    <div className="relative select-none z-[500]" ref={ref}>
      <div
        data-tooltip-id="tooltip"
        data-tooltip-content={t('select_platform_tooltip', 'Filter by Platform')}
        onClick={openClose}
        className={clsx(
          'relative z-[20] cursor-pointer h-[42px] rounded-[8px] pl-[16px] pr-[12px] gap-[8px] border flex items-center',
          open ? 'border-[#612BD3]' : 'border-newColColor'
        )}
      >
        <div>
          <FilterIcon size={18} />
        </div>
        {activePlatform && (
          <div className="text-[14px] font-[500] max-w-[120px] truncate">
            {activePlatform.display}
          </div>
        )}
        <div>
          <DropdownArrowIcon rotated={open} />
        </div>
      </div>
      {open && (
        <div
          style={pos}
          className="flex flex-col fixed pt-[12px] bg-newBgColorInner menu-shadow min-w-[250px]"
        >
          <div className="text-[14px] font-[600] px-[12px] mb-[5px]">
            {t('platforms', 'Platforms')}
          </div>
          <div
            onClick={() => {
              setPlatform('');
              onChange('');
              setOpen(false);
            }}
            className={clsx(
              'p-[12px] hover:bg-newBgColor text-[14px] font-[500] h-[32px] flex items-center gap-[8px]',
              !platform && 'text-textItemFocused'
            )}
          >
            {t('all_platforms', 'All platforms')}
          </div>
          {uniquePlatforms.map((p) => (
            <div
              onClick={() => {
                setPlatform(p.identifier);
                onChange(p.identifier);
                setOpen(false);
              }}
              key={p.identifier}
              className={clsx(
                'p-[12px] hover:bg-newBgColor text-[14px] font-[500] h-[32px] flex items-center gap-[8px]',
                platform === p.identifier && 'text-textItemFocused'
              )}
            >
              {p.picture && (
                <img
                  src={p.picture}
                  alt={p.display}
                  className="w-[20px] h-[20px] rounded-full"
                />
              )}
              {p.display}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
