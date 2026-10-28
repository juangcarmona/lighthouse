// Controlled defect fixture for native unattended-delivery acceptance.
// Intended behavior: values equal to or above 2 qualify; lower values do not.
export const eligible = value => value > 2;
