"use client";

import type { RenewalPreset } from "@/lib/forms/display";
import { formFormSelectClassName } from "@/lib/forms/display";

type RenewalSettingsFieldsProps = {
  preset: RenewalPreset;
  customMonths: number | null;
  onPresetChange: (preset: RenewalPreset) => void;
  onCustomMonthsChange: (months: number | null) => void;
  disabled?: boolean;
};

export function RenewalSettingsFields({
  preset,
  customMonths,
  onPresetChange,
  onCustomMonthsChange,
  disabled = false,
}: RenewalSettingsFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-900" htmlFor="renewalPreset">
          Renewal
        </label>
        <select
          id="renewalPreset"
          name="renewalPreset"
          value={preset}
          disabled={disabled}
          onChange={(event) =>
            onPresetChange(event.target.value as RenewalPreset)
          }
          className={formFormSelectClassName}
        >
          <option value="never">Never</option>
          <option value="3">Every 3 months</option>
          <option value="6">Every 6 months</option>
          <option value="12">Every 12 months</option>
          <option value="custom">Custom</option>
        </select>
        <p className="text-sm text-zinc-600">
          This sets how long a submitted form remains valid. Expired forms are
          marked accordingly.
        </p>
      </div>

      {preset === "custom" ? (
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-zinc-900"
            htmlFor="customRenewalMonths"
          >
            Custom interval (months)
          </label>
          <input
            id="customRenewalMonths"
            name="customRenewalMonths"
            type="number"
            min={1}
            step={1}
            disabled={disabled}
            value={customMonths ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              onCustomMonthsChange(
                value === "" ? null : Number.parseInt(value, 10),
              );
            }}
            className="flex h-10 w-full max-w-xs rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      ) : (
        <input type="hidden" name="customRenewalMonths" value="" />
      )}
    </div>
  );
}
