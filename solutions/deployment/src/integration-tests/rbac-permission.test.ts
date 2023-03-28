import { getFhirClient, randomPatient } from './utils';

jest.setTimeout(60 * 1000);

test('practitioner role can create new patient', async () => {
  const client = await getFhirClient({ role: 'practitioner' });
  const patientRecord: any = randomPatient();
  delete patientRecord.id;
  await expect(client.post('Patient', patientRecord)).resolves.toMatchObject({
    status: 201,
    data: patientRecord
  });
});

describe('Negative tests', () => {
  test('invalid token', async () => {
    const client = await getFhirClient({ role: 'practitioner', providedAccessToken: 'Invalid token' });
    await expect(client.post('Patient', randomPatient())).rejects.toMatchObject({
      response: { status: 401 }
    });
  });

  test('auditor role cannot create new patient record', async () => {
    const client = await getFhirClient({ role: 'auditor' });
    await expect(client.post('Patient', randomPatient())).rejects.toMatchObject({
      response: { status: 401 }
    });
  });
  /*
  LOCAL TESTING ONLY - configure your env file to include VALIDATE_XHTML = 'true' 
  to run integration test locally
  */
  test('failing XHTML Validation: patient with invalid family name', async () => {
    if (process.env.VALIDATE_XHTML !== 'true') {
      return;
    }
    // BUILD
    const client = await getFhirClient({ role: 'practitioner' });
    const patient = randomPatient();
    patient.name[0].family = '<script>alert(123);</script>';

    // OPERATE & CHECK
    await expect(client.post('/Patient/', patient)).rejects.toMatchObject({
      response: { status: 400 }
    });
  });
});
