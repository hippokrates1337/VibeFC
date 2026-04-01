'use client'

import { DataIntakeContainer } from './_components/data-intake-container'
import { VariableListRow } from './_components/variable-list-row'
import { VariableDetailsModal } from './_components/variable-details-modal'
import { EmptyState } from './_components/state-display'
import {
  groupVariablesByType,
  VARIABLE_CATEGORY_ORDER,
  getVariableCategoryLabel
} from './_components/variable-categories'
import { ReactNode } from 'react'

export default function DataIntake(): ReactNode {
  return (
    <DataIntakeContainer>
      {(props) => {
        const {
          filteredVariables,
          handleDeleteClick,
          handleOpenDetailsModal,
          isDetailsModalOpen,
          selectedVariableForModal,
          closeDetailsModal,
          handleUpdateVariable,
          selectedOrgIdFromOrgStore
        } = props;

        if (filteredVariables.length === 0) {
          return (
            <EmptyState
              message="No variables found for the selected organization. Upload a CSV file to get started."
            />
          );
        }

        const grouped = groupVariablesByType(filteredVariables);

        return (
          <>
            <div className="mt-8 flex flex-col gap-8" data-testid="data-table">
              {VARIABLE_CATEGORY_ORDER.map((type) => {
                const vars = grouped[type];
                if (vars.length === 0) {
                  return null;
                }
                const sectionId = `data-intake-category-${type}`;
                return (
                  <section key={type} aria-labelledby={sectionId}>
                    <h2
                      id={sectionId}
                      className="mb-3 text-lg font-semibold tracking-tight text-slate-200"
                    >
                      {getVariableCategoryLabel(type)}
                    </h2>
                    <div className="flex flex-col gap-2">
                      {vars.map((variable) => (
                        <VariableListRow
                          key={variable.id}
                          variable={variable}
                          onDelete={handleDeleteClick}
                          onViewDetails={handleOpenDetailsModal}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            <VariableDetailsModal
              isOpen={isDetailsModalOpen}
              onClose={closeDetailsModal}
              variableToEdit={selectedVariableForModal}
              onSave={handleUpdateVariable}
              currentOrganizationId={selectedOrgIdFromOrgStore}
            />
          </>
        );
      }}
    </DataIntakeContainer>
  );
}
