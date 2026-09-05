"use client";

import { useState } from "react";
import Link from "next/link";
import { FormContentText } from "@/components/forms/FormContentFields";
import { AssignFormToClient } from "@/components/forms/AssignFormToClient";
import { RequestFormUpdateButton } from "@/components/forms/RequestFormUpdateButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  normalizeFormHistory,
  type FormHistoryAssignment,
} from "@/lib/forms/history";
import {
  formAssignmentKindLabel,
  pendingAssignmentActionLabel,
} from "@/lib/forms/display";
import {
  formatSubmissionDate,
  getSubmissionValidityStatus,
} from "@/lib/forms/submission-view";
import type { Form } from "@/types/database";

type ClientFormsSectionProps = {
  clientId: string;
  assignments: FormHistoryAssignment[];
  forms: Pick<Form, "id" | "title">[];
  canAssign: boolean;
};

export function ClientFormsSection({
  clientId,
  assignments,
  forms,
  canAssign,
}: ClientFormsSectionProps) {
  const [assignOpen, setAssignOpen] = useState(false);
  const items = normalizeFormHistory(assignments);
  const pending = items.filter((item) => item.status === "pending");
  const completed = items.filter((item) => item.status === "completed");

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Forms &amp; health information</CardTitle>
        {canAssign && !assignOpen ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAssignOpen(true)}
          >
            + Assign form
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {assignOpen && canAssign ? (
          <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-zinc-900">Assign a form</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAssignOpen(false)}
              >
                Cancel
              </Button>
            </div>
            <AssignFormToClient clientId={clientId} forms={forms} />
          </div>
        ) : null}

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-900">Needs action</h3>
          {pending.length === 0 ? (
            <p className="text-sm text-zinc-600">No pending form assignments.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
              {pending.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 p-3"
                >
                  <div className="space-y-1">
                    <FormContentText className="text-sm font-medium text-zinc-900">
                      {item.title}
                    </FormContentText>
                    <p className="text-sm text-zinc-600">
                      Assigned {formatSubmissionDate(item.assignedAt)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formAssignmentKindLabel(item.assignmentKind)}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    {pendingAssignmentActionLabel(item.assignmentKind)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-900">
            Completed &amp; history
          </h3>
          {completed.length === 0 ? (
            <p className="text-sm text-zinc-600">No completed forms yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
              {completed.map((item) => {
                const validity = getSubmissionValidityStatus(item.validUntil);
                return (
                  <li key={item.id} className="space-y-3 p-3">
                    <Link
                      href={`/clients/${clientId}/forms/${item.id}`}
                      className="block space-y-1 transition-colors hover:text-zinc-950"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <FormContentText className="text-sm font-medium text-zinc-900">
                          {item.title}
                        </FormContentText>
                        <span className="text-xs font-medium text-zinc-500">
                          View submission →
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {item.isCurrentCompleted ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800">
                            Current
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600">
                            Previous version
                          </span>
                        )}
                        {validity === "expired" ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
                            Expired
                          </span>
                        ) : null}
                        {validity === "valid" && item.validUntil ? (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600">
                            Valid until {formatSubmissionDate(item.validUntil)}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-zinc-600">
                        Submitted{" "}
                        {item.submittedAt || item.completedAt
                          ? formatSubmissionDate(
                              item.submittedAt ?? item.completedAt!,
                            )
                          : "—"}
                      </p>
                    </Link>
                    {item.isCurrentCompleted &&
                    item.submissionId &&
                    !item.formArchived &&
                    !item.formHasPending ? (
                      <RequestFormUpdateButton
                        clientId={clientId}
                        formId={item.formId}
                        fromSubmissionId={item.submissionId}
                      />
                    ) : null}
                    {item.isCurrentCompleted && item.formHasPending ? (
                      <p className="text-xs text-zinc-500">
                        An update is already waiting for this client.
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
