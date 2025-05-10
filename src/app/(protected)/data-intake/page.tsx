'use client'

import { DataIntakeContainer } from './_components/data-intake-container'
import { VariableCard } from './_components/variable-card'
import { VariableDetailsModal } from './_components/variable-details-modal'
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

        // Only render variables if we have any
        if (filteredVariables.length === 0) {
          return null; // Empty state is handled by DataIntakeContainer
        }

        return (
          <>
            {/* Variable Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
              {filteredVariables.map((variable) => (
                <VariableCard
                  key={variable.id}
                  variable={variable}
                  onDelete={handleDeleteClick}
                  onViewDetails={handleOpenDetailsModal}
                />
              ))}
            </div>

            {/* Variable Details Modal */}
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